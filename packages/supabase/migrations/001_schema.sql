-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- CATALOG TABLES (public, no RLS needed)
-- ─────────────────────────────────────────────

create table if not exists climate_zones (
  id          text primary key,  -- 'atlantica' | 'continental' | 'mediterranea' | 'subtropical'
  label       text not null,
  emoji       text not null,
  description text not null
);

create table if not exists province_zones (
  province  text primary key,
  zone      text not null references climate_zones(id)
);

create table if not exists crops (
  id                              text primary key,
  name                            text not null,
  emoji                           text not null,
  category                        text not null,
  sowing_months_atlantica         integer[] not null default '{}',
  sowing_months_continental       integer[] not null default '{}',
  sowing_months_mediterranea      integer[] not null default '{}',
  sowing_months_subtropical       integer[] not null default '{}',
  harvest_months_atlantica        integer[] not null default '{}',
  harvest_months_continental      integer[] not null default '{}',
  harvest_months_mediterranea     integer[] not null default '{}',
  harvest_months_subtropical      integer[] not null default '{}',
  days_to_harvest_min             integer not null,
  days_to_harvest_max             integer not null,
  sun_needs                       text not null,
  water_needs                     text not null,
  spacing_cm                      integer not null,
  companions                      text[] not null default '{}',
  incompatible                    text[] not null default '{}',
  tips                            text not null default '',
  active                          boolean not null default true,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- USER TABLES
-- ─────────────────────────────────────────────

create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  tier         text not null default 'free',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists gardens (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references profiles(id) on delete cascade,
  name         text not null,
  province     text,
  climate_zone text not null references climate_zones(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists plants (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references profiles(id) on delete cascade,
  garden_id    uuid not null references gardens(id) on delete cascade,
  crop_id      text not null references crops(id),
  name         text not null,
  variety      text,
  status       text not null default 'seedling',
  planted_at   date,
  photo_uri    text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists diary_entries (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references profiles(id) on delete cascade,
  plant_id          uuid not null references plants(id) on delete cascade,
  garden_id         uuid not null references gardens(id) on delete cascade,
  type              text not null,
  notes             text,
  photo_uri         text,
  harvest_weight_g  integer,
  recorded_at       timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

create table if not exists reminders (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  garden_id       uuid not null references gardens(id) on delete cascade,
  plant_id        uuid references plants(id) on delete set null,
  type            text not null,
  title           text not null,
  frequency       text not null,
  time_hour       integer not null default 9,
  time_minute     integer not null default 0,
  enabled         boolean not null default true,
  notification_id text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- TRIGGER: auto-create profile on signup
-- ─────────────────────────────────────────────

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, display_name, tier)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    'free'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─────────────────────────────────────────────
-- SEED: climate zones
-- ─────────────────────────────────────────────

insert into climate_zones (id, label, emoji, description) values
  ('atlantica',    'Atlántica',    '🌧️', 'Veranos frescos, inviernos suaves, lluvia abundante todo el año'),
  ('continental',  'Continental',  '❄️',  'Veranos calurosos, inviernos fríos, pocas lluvias'),
  ('mediterranea', 'Mediterránea', '☀️',  'Veranos secos y calurosos, inviernos suaves'),
  ('subtropical',  'Subtropical',  '🌴', 'Temperaturas cálidas todo el año, sin heladas')
on conflict (id) do update set
  label = excluded.label,
  emoji = excluded.emoji,
  description = excluded.description;

-- ─────────────────────────────────────────────
-- SEED: province → zone mapping
-- ─────────────────────────────────────────────

insert into province_zones (province, zone) values
  -- Atlántica
  ('A Coruña',    'atlantica'),
  ('Lugo',        'atlantica'),
  ('Pontevedra',  'atlantica'),
  ('Asturias',    'atlantica'),
  ('Cantabria',   'atlantica'),
  ('Vizcaya',     'atlantica'),
  ('Guipúzcoa',   'atlantica'),
  -- Continental
  ('Ourense',        'continental'),
  ('Álava',          'continental'),
  ('Navarra',        'continental'),
  ('La Rioja',       'continental'),
  ('Madrid',         'continental'),
  ('Toledo',         'continental'),
  ('Ciudad Real',    'continental'),
  ('Cuenca',         'continental'),
  ('Guadalajara',    'continental'),
  ('Albacete',       'continental'),
  ('Ávila',          'continental'),
  ('Segovia',        'continental'),
  ('Soria',          'continental'),
  ('Burgos',         'continental'),
  ('Palencia',       'continental'),
  ('Valladolid',     'continental'),
  ('Zamora',         'continental'),
  ('Salamanca',      'continental'),
  ('León',           'continental'),
  ('Zaragoza',       'continental'),
  ('Huesca',         'continental'),
  ('Teruel',         'continental'),
  ('Lleida',         'continental'),
  ('Cáceres',        'continental'),
  ('Badajoz',        'continental'),
  ('Córdoba',        'continental'),
  ('Jaén',           'continental'),
  -- Mediterránea
  ('Barcelona',   'mediterranea'),
  ('Tarragona',   'mediterranea'),
  ('Girona',      'mediterranea'),
  ('Valencia',    'mediterranea'),
  ('Alicante',    'mediterranea'),
  ('Castellón',   'mediterranea'),
  ('Murcia',      'mediterranea'),
  ('Almería',     'mediterranea'),
  ('Málaga',      'mediterranea'),
  ('Granada',     'mediterranea'),
  ('Baleares',    'mediterranea'),
  ('Sevilla',     'mediterranea'),
  ('Cádiz',       'mediterranea'),
  ('Huelva',      'mediterranea'),
  ('Ceuta',       'mediterranea'),
  ('Melilla',     'mediterranea'),
  -- Subtropical
  ('Las Palmas',                  'subtropical'),
  ('Santa Cruz de Tenerife',      'subtropical')
on conflict (province) do update set zone = excluded.zone;

-- ─────────────────────────────────────────────
-- SEED: crops (35 crops)
-- ─────────────────────────────────────────────

insert into crops (
  id, name, emoji, category,
  sowing_months_atlantica, sowing_months_continental, sowing_months_mediterranea, sowing_months_subtropical,
  harvest_months_atlantica, harvest_months_continental, harvest_months_mediterranea, harvest_months_subtropical,
  days_to_harvest_min, days_to_harvest_max,
  sun_needs, water_needs, spacing_cm, companions, incompatible, tips
) values
-- FRUTAS
('tomate', 'Tomate', '🍅', 'frutas',
  '{2,3,4}', '{2,3,4}', '{1,2,3,8,9}', '{1,2,3,9,10}',
  '{7,8,9,10}', '{7,8,9}', '{6,7,8,9,10}', '{4,5,6,12}',
  60, 85, 'full', 'high', 60,
  '{albahaca,perejil,zanahoria,ajo}', '{hinojo,col,brócoli,coliflor}',
  'Desbrota regularmente para concentrar energía en los frutos. Riega en la base, nunca por las hojas.'),

('pimiento', 'Pimiento', '🫑', 'frutas',
  '{2,3,4}', '{2,3,4}', '{1,2,3}', '{1,2,9,10}',
  '{7,8,9,10}', '{7,8,9}', '{6,7,8,9,10}', '{4,5,6,12,1}',
  70, 90, 'full', 'medium', 50,
  '{zanahoria,albahaca,tomate}', '{hinojo}',
  'Necesita noches cálidas para cuajar bien. En terrazas, ponlo contra una pared orientada al sur.'),

('berenjena', 'Berenjena', '🍆', 'frutas',
  '{3,4}', '{3,4}', '{2,3,4}', '{1,2,9,10}',
  '{8,9,10}', '{7,8,9}', '{6,7,8,9,10}', '{4,5,6,12}',
  65, 80, 'full', 'medium', 60,
  '{albahaca}', '{hinojo}',
  'Es la más exigente en calor de la familia solanácea. Cosecha antes de que pierda brillo la piel.'),

('fresa', 'Fresa', '🍓', 'frutas',
  '{8,9,10}', '{8,9,10}', '{9,10,11}', '{9,10,11}',
  '{5,6,7}', '{5,6}', '{3,4,5,6}', '{2,3,4,5}',
  90, 120, 'full', 'medium', 30,
  '{ajo,cebolla,espinaca}', '{col,brócoli}',
  'Planta en otoño para cosechar en primavera. Cubre el suelo con paja para mantener la humedad.'),

-- HOJAS
('lechuga', 'Lechuga', '🥬', 'hojas',
  '{2,3,4,8,9}', '{2,3,4,8,9}', '{1,2,3,9,10,11}', '{1,2,3,9,10,11,12}',
  '{4,5,6,10,11}', '{4,5,6,10,11}', '{3,4,5,11,12,1}', '{3,4,5,11,12,1,2}',
  45, 70, 'partial', 'medium', 25,
  '{zanahoria,rábano,fresa,tomate}', '{apio}',
  'Siembra escalonada cada 2-3 semanas. Con calor sube a flor rápido.'),

('espinaca', 'Espinaca', '🌿', 'hojas',
  '{2,3,8,9,10}', '{2,3,8,9}', '{1,2,9,10,11}', '{9,10,11,12,1,2}',
  '{4,5,6,10,11,12}', '{4,5,6,10,11}', '{3,4,5,11,12,1}', '{11,12,1,2,3,4}',
  40, 60, 'partial', 'medium', 15,
  '{fresa,ajo,lechuga}', '{remolacha}',
  'Cultivo de estación fría. Cosecha las hojas exteriores y el corazón seguirá brotando.'),

('acelga', 'Acelga', '🥦', 'hojas',
  '{3,4,5,8}', '{3,4,5,8}', '{2,3,4,8,9}', '{1,2,3,9,10}',
  '{6,7,8,9,10,11}', '{6,7,8,9,10}', '{4,5,6,7,10,11,12}', '{3,4,5,6,11,12,1}',
  50, 70, 'partial', 'medium', 30,
  '{lechuga,tomate}', '{espinaca}',
  'Muy productiva y resistente. Corta desde el exterior; una planta puede durar más de un año.'),

('rucula', 'Rúcula', '🌱', 'hojas',
  '{3,4,5,8,9}', '{3,4,8,9}', '{2,3,9,10,11}', '{9,10,11,1,2,3}',
  '{4,5,6,10,11}', '{4,5,10,11}', '{3,4,5,10,11,12}', '{11,12,1,2,3,4}',
  30, 45, 'partial', 'low', 15,
  '{lechuga,zanahoria,rábano}', '{}',
  'Crece en 4 semanas. Con calor se vuelve muy picante; siembra en semisombra en verano.'),

('canonigos', 'Canónigos', '🌿', 'hojas',
  '{8,9,10}', '{8,9,10}', '{9,10,11}', '{9,10,11,12}',
  '{10,11,12,1,2,3}', '{10,11,12,1,2}', '{11,12,1,2,3}', '{11,12,1,2,3,4}',
  50, 70, 'partial', 'low', 10,
  '{lechuga,espinaca}', '{}',
  'Cultivo de otoño-invierno ideal para mantener el huerto productivo en la estación fría.'),

-- RAÍCES
('zanahoria', 'Zanahoria', '🥕', 'raices',
  '{3,4,5,6}', '{3,4,5}', '{2,3,4,9,10}', '{9,10,11,2,3}',
  '{6,7,8,9,10}', '{6,7,8,9}', '{5,6,7,12,1}', '{12,1,2,5,6}',
  70, 90, 'full', 'medium', 8,
  '{lechuga,tomate,puerro,romero}', '{hinojo,eneldo}',
  'Necesita suelo profundo y suelto sin piedras. Aclara a 8 cm cuando las plantitas midan 5 cm.'),

('rabano', 'Rábano', '🌶️', 'raices',
  '{3,4,5,8,9}', '{3,4,8,9}', '{2,3,9,10,11}', '{9,10,11,1,2}',
  '{4,5,6,9,10}', '{4,5,9,10}', '{3,4,10,11,12}', '{10,11,12,2,3}',
  25, 35, 'partial', 'medium', 5,
  '{zanahoria,pepino,lechuga,espinaca}', '{col,brócoli}',
  'El cultivo más rápido del huerto. Cosecha puntualmente o se vuelve leñoso.'),

('remolacha', 'Remolacha', '🟣', 'raices',
  '{3,4,5}', '{3,4,5}', '{2,3,9,10}', '{9,10,11,2,3}',
  '{6,7,8,9}', '{6,7,8}', '{5,6,12,1}', '{12,1,5,6}',
  55, 75, 'full', 'medium', 10,
  '{lechuga,col,zanahoria}', '{espinaca}',
  'Cada semilla es un fruto con varias semillas; aclara a 10 cm dejando la plántula más vigorosa.'),

('patata', 'Patata', '🥔', 'raices',
  '{3,4,5}', '{3,4}', '{2,3,9,10}', '{9,10,11,1,2}',
  '{7,8,9}', '{7,8}', '{6,7,12,1}', '{1,2,3,4,5}',
  70, 120, 'full', 'medium', 35,
  '{judía verde,col,puerro}', '{tomate,calabaza,pepino}',
  'Aporca tierra alrededor del tallo según crezca para obtener más tubérculos.'),

('nabo', 'Nabo', '🫛', 'raices',
  '{7,8,9}', '{7,8,9}', '{8,9,10}', '{9,10,11}',
  '{10,11,12,1}', '{10,11,12}', '{11,12,1,2}', '{12,1,2,3}',
  45, 65, 'full', 'medium', 15,
  '{guisante,espinaca}', '{mostaza}',
  'Cultivo otoñal rústico. Cosecha pequeño (5-7 cm) para mejor sabor.'),

-- LEGUMBRES
('judia-verde', 'Judía verde', '🫘', 'legumbres',
  '{4,5,6}', '{4,5,6}', '{3,4,5,8}', '{2,3,4,9,10}',
  '{7,8,9,10}', '{7,8,9}', '{5,6,7,10,11}', '{4,5,6,12,1}',
  50, 70, 'full', 'medium', 20,
  '{zanahoria,pepino,col,remolacha}', '{cebolla,ajo,hinojo}',
  'Cosecha frecuentemente cuando las vainas aún se doblan; dejarlas madurar agota la planta.'),

('guisante', 'Guisante', '🟢', 'legumbres',
  '{2,3,9,10}', '{2,3,9,10}', '{10,11,12,1,2}', '{10,11,12,1,2}',
  '{5,6,12,1}', '{5,6,12}', '{2,3,4,5}', '{1,2,3,4}',
  60, 80, 'full', 'medium', 10,
  '{zanahoria,nabo,lechuga,espinaca}', '{cebolla,ajo,puerro}',
  'Cultivo de estación fría. Proporciona soporte desde el principio.'),

('haba', 'Haba', '🫘', 'legumbres',
  '{10,11,2,3}', '{10,11,2,3}', '{10,11,12}', '{10,11,12}',
  '{4,5,6}', '{4,5,6}', '{3,4,5}', '{2,3,4}',
  90, 120, 'full', 'medium', 25,
  '{zanahoria,espinaca,lechuga}', '{cebolla,ajo}',
  'Siembra en otoño para mayor producción. Despunta el tallo cuando aparezcan los primeros frutos.'),

-- CRUCÍFERAS
('brocoli', 'Brócoli', '🥦', 'cruciferas',
  '{3,4,7,8}', '{3,4,7,8}', '{7,8,9}', '{8,9,10}',
  '{5,6,10,11,12}', '{5,6,10,11}', '{10,11,12,1}', '{11,12,1,2}',
  65, 90, 'full', 'medium', 50,
  '{apio,cebolla,zanahoria,remolacha}', '{tomate,judía verde,fresa}',
  'Cosecha la cabeza central antes de que florezca. Seguirá produciendo brotes laterales.'),

('coliflor', 'Coliflor', '🌸', 'cruciferas',
  '{3,4,7,8}', '{3,4,7,8}', '{7,8,9}', '{8,9,10}',
  '{6,7,10,11,12}', '{6,7,10,11}', '{10,11,12,1,2}', '{11,12,1,2,3}',
  70, 100, 'full', 'medium', 55,
  '{apio,cebolla,zanahoria}', '{tomate,judía verde}',
  'Dobla las hojas exteriores sobre la pella para blanquearla y protegerla del sol.'),

('col', 'Col / Repollo', '🥬', 'cruciferas',
  '{3,4,7,8}', '{3,4,7,8}', '{7,8,9}', '{8,9,10}',
  '{6,7,11,12,1}', '{6,7,10,11}', '{10,11,12,1,2}', '{11,12,1,2,3}',
  80, 120, 'full', 'medium', 50,
  '{apio,cebolla,zanahoria,remolacha,patata}', '{tomate,judía verde,fresa}',
  'Muy resistente a las heladas. Aporca tierra alrededor del tallo para que no vuelque.'),

('kale', 'Kale (Col rizada)', '🌿', 'cruciferas',
  '{3,4,7,8}', '{3,4,7,8}', '{7,8,9}', '{8,9,10,11}',
  '{6,7,10,11,12,1}', '{6,7,10,11,12}', '{10,11,12,1,2,3}', '{11,12,1,2,3,4}',
  55, 75, 'full', 'medium', 45,
  '{apio,cebolla,zanahoria}', '{tomate,judía verde}',
  'Cosecha las hojas inferiores; la planta sigue creciendo desde arriba. El frío mejora el sabor.'),

-- CUCURBITÁCEAS
('calabacin', 'Calabacín', '🥒', 'cucurbitaceas',
  '{4,5}', '{4,5}', '{3,4,5,8}', '{2,3,4,9}',
  '{7,8,9,10}', '{7,8,9}', '{5,6,7,8,10,11}', '{4,5,6,11,12}',
  45, 60, 'full', 'high', 80,
  '{judía verde,lechuga}', '{patata}',
  'Una sola planta puede dar 3-4 kg por semana. Cosecha a 15-20 cm.'),

('pepino', 'Pepino', '🥒', 'cucurbitaceas',
  '{4,5}', '{4,5}', '{3,4,5}', '{2,3,9,10}',
  '{7,8,9}', '{7,8,9}', '{6,7,8,9}', '{4,5,6,12,1}',
  50, 65, 'full', 'high', 50,
  '{judía verde,rábano}', '{patata,salvia}',
  'Conduce la planta en espaldera para ahorrar espacio. Cosecha a diario en producción.'),

('calabaza', 'Calabaza', '🎃', 'cucurbitaceas',
  '{4,5}', '{4,5}', '{3,4,5}', '{2,3,9,10}',
  '{9,10,11}', '{9,10}', '{8,9,10,11}', '{6,7,12,1}',
  90, 120, 'full', 'medium', 100,
  '{maíz,judía verde}', '{patata}',
  'Necesita mucho espacio. El fruto está listo cuando el pedúnculo se seca.'),

('melon', 'Melón', '🍈', 'cucurbitaceas',
  '{4,5}', '{4,5}', '{3,4,5}', '{2,3,4}',
  '{8,9}', '{8,9}', '{7,8,9}', '{6,7,8}',
  75, 100, 'full', 'medium', 80,
  '{maíz,girasol}', '{patata,pepino}',
  'Poda a 2-3 frutos por planta. Reduce el riego cuando los frutos estén cuajados.'),

('sandia', 'Sandía', '🍉', 'cucurbitaceas',
  '{4,5}', '{4,5}', '{3,4,5}', '{2,3,4}',
  '{8,9}', '{8,9}', '{7,8,9}', '{6,7,8}',
  80, 110, 'full', 'high', 100,
  '{maíz,girasol}', '{patata,pepino}',
  'Golpea suavemente: sonido hueco indica madurez. El zarcillo más cercano debe estar seco.'),

-- AROMÁTICAS
('albahaca', 'Albahaca', '🌿', 'aromaticas',
  '{4,5,6}', '{4,5,6}', '{3,4,5,6}', '{2,3,4,5,6}',
  '{6,7,8,9}', '{6,7,8,9}', '{5,6,7,8,9,10}', '{4,5,6,7,8,9,10}',
  30, 50, 'full', 'medium', 25,
  '{tomate,pimiento,berenjena}', '{salvia,romero}',
  'Pínzala para que ramifique. Es la mejor compañera del tomate.'),

('perejil', 'Perejil', '🌱', 'aromaticas',
  '{2,3,4,8,9}', '{2,3,4,8,9}', '{2,3,9,10}', '{1,2,3,9,10,11}',
  '{5,6,7,8,10,11}', '{5,6,7,8,10,11}', '{4,5,6,11,12,1}', '{3,4,5,11,12,1,2}',
  70, 90, 'partial', 'medium', 20,
  '{tomate,zanahoria}', '{lechuga}',
  'Germinación lenta (3-4 semanas). Remoja las semillas 24h antes de sembrar.'),

('cilantro', 'Cilantro', '🌿', 'aromaticas',
  '{3,4,5,8,9}', '{3,4,5,8}', '{2,3,9,10}', '{1,2,9,10,11}',
  '{5,6,7,10,11}', '{5,6,7,10}', '{4,5,11,12}', '{3,4,11,12,1}',
  30, 45, 'partial', 'medium', 15,
  '{anís,espinaca}', '{hinojo}',
  'Sube a semilla rápido con calor; siembra escalonada cada 3 semanas.'),

('romero', 'Romero', '🌿', 'aromaticas',
  '{3,4,9}', '{3,4,9}', '{3,4,9,10}', '{1,2,3,9,10}',
  '{5,6,7,8,9,10}', '{5,6,7,8,9}', '{4,5,6,7,8,9,10,11}', '{3,4,5,6,10,11,12}',
  90, 180, 'full', 'low', 50,
  '{col,zanahoria,salvia}', '{albahaca}',
  'Planta perenne muy resistente. Mejor multiplicar por esquejes. No tolera el encharcamiento.'),

('tomillo', 'Tomillo', '🌿', 'aromaticas',
  '{3,4,9}', '{3,4,9}', '{3,4,9,10}', '{1,2,3,9,10,11}',
  '{5,6,7,8,9}', '{5,6,7,8,9}', '{4,5,6,7,8,9,10}', '{3,4,5,6,10,11,12}',
  70, 120, 'full', 'low', 30,
  '{col,berenjena,tomate}', '{}',
  'Aromática mediterránea que resiste muy bien la sequía. Pódala tras la floración.'),

('menta', 'Menta', '🌿', 'aromaticas',
  '{3,4,9}', '{3,4,9}', '{3,4,9,10}', '{1,2,3,9,10}',
  '{5,6,7,8,9,10}', '{5,6,7,8,9}', '{4,5,6,7,8,9,10,11}', '{3,4,5,6,10,11,12}',
  30, 60, 'partial', 'medium', 30,
  '{col,tomate,guisante}', '{perejil}',
  'Muy invasiva: plántala siempre en maceta o con barrera subterránea.'),

-- BULBOS
('ajo', 'Ajo', '🧄', 'bulbos',
  '{10,11}', '{10,11}', '{10,11,12}', '{10,11,12}',
  '{6,7}', '{6,7}', '{5,6}', '{4,5}',
  180, 240, 'full', 'low', 12,
  '{tomate,zanahoria,fresa}', '{judía verde,guisante,haba}',
  'Planta dientes individuales con la punta hacia arriba a 5 cm. Cosecha cuando la mitad de las hojas se seque.'),

('cebolla', 'Cebolla', '🧅', 'bulbos',
  '{2,3,9,10}', '{2,3,9,10}', '{9,10,11,2,3}', '{9,10,11,12}',
  '{6,7,8,12,1}', '{6,7,8,12}', '{5,6,7,1,2}', '{3,4,5}',
  90, 150, 'full', 'low', 15,
  '{zanahoria,remolacha,tomate,lechuga}', '{judía verde,guisante,haba}',
  'Dobla las hojas cuando caigan solas y deja el bulbo curar en tierra 2 semanas antes de cosechar.'),

('puerro', 'Puerro', '🌿', 'bulbos',
  '{2,3,4}', '{2,3,4}', '{1,2,3,9}', '{9,10,1,2}',
  '{9,10,11,12,1,2}', '{9,10,11,12,1}', '{8,9,10,11,12,1,2}', '{12,1,2,3,4,5}',
  120, 180, 'full', 'medium', 15,
  '{zanahoria,apio,col}', '{judía verde,guisante}',
  'Trasplanta en hoyos profundos y ve aporcando tierra para blanquear el tallo.')

on conflict (id) do update set
  name = excluded.name,
  emoji = excluded.emoji,
  category = excluded.category,
  sowing_months_atlantica = excluded.sowing_months_atlantica,
  sowing_months_continental = excluded.sowing_months_continental,
  sowing_months_mediterranea = excluded.sowing_months_mediterranea,
  sowing_months_subtropical = excluded.sowing_months_subtropical,
  harvest_months_atlantica = excluded.harvest_months_atlantica,
  harvest_months_continental = excluded.harvest_months_continental,
  harvest_months_mediterranea = excluded.harvest_months_mediterranea,
  harvest_months_subtropical = excluded.harvest_months_subtropical,
  days_to_harvest_min = excluded.days_to_harvest_min,
  days_to_harvest_max = excluded.days_to_harvest_max,
  sun_needs = excluded.sun_needs,
  water_needs = excluded.water_needs,
  spacing_cm = excluded.spacing_cm,
  companions = excluded.companions,
  incompatible = excluded.incompatible,
  tips = excluded.tips,
  updated_at = now();
