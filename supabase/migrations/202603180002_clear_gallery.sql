-- Clear all existing community gallery items.
-- Previously all generations were auto-synced into the gallery via trigger.
-- Now that gallery is admin-curated only, we wipe the old auto-populated data
-- so the gallery starts empty and admin can hand-pick what to show.
delete from public.community_gallery_items;
