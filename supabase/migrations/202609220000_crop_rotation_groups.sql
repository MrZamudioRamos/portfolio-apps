-- Keep the root Supabase CLI migration history in sync with the package schema.
-- Catalog ids are curated from the app reference data; unknown crops stay NULL.
alter table public.crops add column if not exists rotation_group text;

update public.crops set rotation_group = case
  when id = any(array['tomate','tomate-cherry','tomatillo','pimiento','pimiento-padron','guindilla','berenjena','patata']::text[]) then 'Solanaceae'
  when id = any(array['brocoli','coliflor','col','kale','coles-bruselas','pak-choi','mizuna','nabo','rabano','daikon','nabicol','colinabo','lombarda','col-china','romanesco','col-savoya','brocoli-morado','rucula']::text[]) then 'Brassicaceae'
  when id = any(array['judia-verde','guisante','haba','lenteja','garbanzo','edamame','tirabeques','alubia','cacahuete','veza','garrofon']::text[]) then 'Fabaceae'
  when id = any(array['ajo','cebolla','puerro','chalota','cebollino','cebolleta','ajo-tierno','cebolla-morada','ajo-elefante','cebolla-francesa','ajo-negro','cipolla-borettana']::text[]) then 'Amaryllidaceae'
  when id = any(array['zanahoria','perejil','cilantro','apio','hinojo','chirivi','apionabo','eneldo','perifollo','anis','alcaravea','coriandro','comino']::text[]) then 'Apiaceae'
  when id = any(array['calabacin','pepino','calabaza','melon','sandia','pepinillo','calabaza-butternut','chayote','calabacin-amarillo']::text[]) then 'Cucurbitaceae'
  when id = any(array['lechuga','canonigos','escarola','endivias','girasol','radicchio','alcachofa','manzanilla','calendula','tagetes','equinacea','stevia']::text[]) then 'Asteraceae'
  when id = any(array['espinaca','acelga','remolacha','remolacha-hoja','amaranto']::text[]) then 'Amaranthaceae'
  when id = any(array['albahaca','albahaca-morada','albahaca-tailandesa','romero','tomillo','menta','hierbabuena','salvia','oregano','mejorana','ajedrea','lavanda','melisa','toronjil','hisopo','nepeta']::text[]) then 'Lamiaceae'
  when id = 'maiz' then 'Poaceae'
  when id = any(array['frambuesa','mora','melocoton','manzano','cerezas','fresa','fresa-silvestre']::text[]) then 'Rosaceae'
  when id = 'arandano' then 'Ericaceae'
  when id = any(array['grosella','grosellaespinosa']::text[]) then 'Grossulariaceae'
  when id = 'higo' then 'Moraceae'
  when id = 'vid' then 'Vitaceae'
  when id = any(array['limon','naranja']::text[]) then 'Rutaceae'
  else null
end
where active = true;
