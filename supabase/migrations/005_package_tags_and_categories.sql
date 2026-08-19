alter table public.packages
add column if not exists card_tags text[] not null default '{}';

update public.packages
set card_tags = case slug
  when '15-days-regular-umrah-from-mumbai' then array['Best Seller', 'Mumbai Special']
  when '15-days-regular-umrah-from-lucknow' then array['Featured']
  when '15-days-regular-umrah-from-delhi' then array['New']
  when '14-days-umrah-land-package' then array['Popular']
  when '30-days-super-saver-land-package' then array['Super Saver']
  when '25-days-super-saver-land-package' then array['Budget']
  else card_tags
end
where card_tags = '{}';
