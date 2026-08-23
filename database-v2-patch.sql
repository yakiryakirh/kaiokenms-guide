-- KaiokenMS Database V2 visual asset patch
-- Safe to run after database-migration.sql.

update public.guide_database_entries
set image_url = 'images/dragon-ball-1-item.png'
where lower(name) like 'dragon ball (1%star%)';

update public.guide_database_entries
set image_url = 'images/dragon-ball-2-item.png'
where lower(name) like 'dragon ball (2%star%)';

update public.guide_database_entries
set image_url = 'images/dragon-ball-3-item.png'
where lower(name) like 'dragon ball (3%star%)';

update public.guide_database_entries
set image_url = 'images/dragon-ball-4-item.png'
where lower(name) like 'dragon ball (4%star%)';

update public.guide_database_entries
set image_url = 'images/dragon-ball-5-item.png'
where lower(name) like 'dragon ball (5%star%)';

update public.guide_database_entries
set image_url = 'images/dragon-ball-6-item.png'
where lower(name) like 'dragon ball (6%star%)';

update public.guide_database_entries
set image_url = 'images/dragon-ball-7-item.png'
where lower(name) like 'dragon ball (7%star%)';

update public.guide_database_entries
set image_url = 'images/kaioken-scroll-icon.png'
where lower(name) in (
  'kaioken force scroll 10%',
  'kaioken stability scroll 100%',
  'kaioken surge scroll',
  'kaioken limit scroll'
);

update public.guide_database_entries
set image_url = 'images/equip-enhancement-scroll.png'
where lower(name) = 'equip enhancement scroll';

update public.guide_database_entries
set image_url = 'images/advanced-equip-enhancement-scroll.png'
where lower(name) = 'advanced equip enhancement scroll';

update public.guide_database_entries
set image_url = 'images/protection-scroll.png'
where lower(name) = 'protection scroll';

update public.guide_database_entries
set image_url = 'images/white-scroll-2340000.png'
where lower(name) = 'white scroll';

update public.guide_database_entries
set image_url = 'images/scouter-1022042-icon.png'
where lower(name) = 'scouter';

update public.guide_database_entries
set image_url = 'images/item-vac-website.png'
where lower(name) like 'kaioken itemvac%';

select 'KaiokenMS Database V2 patch complete' as status;
