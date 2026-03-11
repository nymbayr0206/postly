alter table public.generations
drop constraint if exists generations_aspect_ratio_check;

alter table public.generations
add constraint generations_aspect_ratio_check
check (aspect_ratio in ('1:1', '4:5', '16:9', '9:19'));
