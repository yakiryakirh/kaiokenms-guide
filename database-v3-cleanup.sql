-- KaiokenMS Database V3 public cleanup
-- Safe to run after database-migration.sql and the V2 patch.

-- Public pages no longer expose external reference/source fields.
update public.guide_database_entries
set source_name = null,
    source_url = null
where source_name is not null or source_url is not null;

-- Reset the current public custom collection. The old Market import mixed normal
-- Maple items, services, NPCs and feature cards into the custom item list.
-- Staff can still add and enable new custom records later from the private editor.
update public.guide_database_entries
set enabled = false;

-- Keep only confirmed or useful KaiokenMS-specific item records enabled.
update public.guide_database_entries
set enabled = true
where lower(name) in (
  'dragon ball (1-star)','dragon ball (1 star)',
  'dragon ball (2-star)','dragon ball (2 star)',
  'dragon ball (3-star)','dragon ball (3 star)',
  'dragon ball (4-star)','dragon ball (4 star)',
  'dragon ball (5-star)','dragon ball (5 star)',
  'dragon ball (6-star)','dragon ball (6 star)',
  'dragon ball (7-star)','dragon ball (7 star)',
  'kaioken force scroll 10%',
  'kaioken stability scroll 100%',
  'kaioken surge scroll',
  'kaioken limit scroll',
  'equip enhancement scroll',
  'advanced equip enhancement scroll',
  'protection scroll',
  'scouter',
  'kaioken itemvac',
  'kaioken itemvac (1 hour)',
  'kaioken diamonds',
  'shenron ring',
  'senzu bean',
  'maple leaf box'
);

-- Force the seven Dragon Ball sprites to the local site assets.
update public.guide_database_entries set image_url='images/dragon-ball-1-item.png' where lower(name) like 'dragon ball (1%star%)';
update public.guide_database_entries set image_url='images/dragon-ball-2-item.png' where lower(name) like 'dragon ball (2%star%)';
update public.guide_database_entries set image_url='images/dragon-ball-3-item.png' where lower(name) like 'dragon ball (3%star%)';
update public.guide_database_entries set image_url='images/dragon-ball-4-item.png' where lower(name) like 'dragon ball (4%star%)';
update public.guide_database_entries set image_url='images/dragon-ball-5-item.png' where lower(name) like 'dragon ball (5%star%)';
update public.guide_database_entries set image_url='images/dragon-ball-6-item.png' where lower(name) like 'dragon ball (6%star%)';
update public.guide_database_entries set image_url='images/dragon-ball-7-item.png' where lower(name) like 'dragon ball (7%star%)';

update public.guide_database_entries set image_url='images/kaioken-scroll-icon.png' where lower(name) in ('kaioken force scroll 10%','kaioken stability scroll 100%','kaioken surge scroll','kaioken limit scroll');
update public.guide_database_entries set image_url='images/equip-enhancement-scroll.png' where lower(name)='equip enhancement scroll';
update public.guide_database_entries set image_url='images/advanced-equip-enhancement-scroll.png' where lower(name)='advanced equip enhancement scroll';
update public.guide_database_entries set image_url='images/protection-scroll.png' where lower(name)='protection scroll';
update public.guide_database_entries set image_url='images/scouter-1022042-icon.png' where lower(name)='scouter';
update public.guide_database_entries set image_url='images/item-vac-website.png' where lower(name) like 'kaioken itemvac%';

select 'KaiokenMS Database V3 cleanup complete' as status;
