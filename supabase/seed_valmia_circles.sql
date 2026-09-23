-- Seed Zug (6) and Baden (6) circles owned by Valmia.
-- Run in: Supabase Dashboard → SQL Editor

do $$
declare
  v_owner_id text := 'user_3F8kv9Uz1fjntw4lrCF8ZBtjglX';
  v_circle_id uuid;
begin

  -- ── ZUG ──────────────────────────────────────────────────────────────────

  insert into public.circles (name, description, category, visibility, location, organizer, owner_id)
  values ('New in Zug',
    'New to Zug or still discovering the area? Meet people, exchange tips and find your way into local life.',
    'Friends', 'public', 'Zug', 'By Valmia', v_owner_id)
  returning id into v_circle_id;
  insert into public.circle_members (circle_id, user_id, role, status)
  values (v_circle_id, v_owner_id, 'owner', 'active');

  insert into public.circles (name, description, category, visibility, location, organizer, owner_id)
  values ('After Work',
    'Drinks, dinner or something spontaneous after work. Meet people beyond the office.',
    'Friends', 'public', 'Zug', 'By Valmia', v_owner_id)
  returning id into v_circle_id;
  insert into public.circle_members (circle_id, user_id, role, status)
  values (v_circle_id, v_owner_id, 'owner', 'active');

  insert into public.circles (name, description, category, visibility, location, organizer, owner_id)
  values ('Sports & Outdoors',
    'Running, hiking, cycling, skiing, lake days and everything that gets us outside.',
    'Sport', 'public', 'Zug', 'By Valmia', v_owner_id)
  returning id into v_circle_id;
  insert into public.circle_members (circle_id, user_id, role, status)
  values (v_circle_id, v_owner_id, 'owner', 'active');

  insert into public.circles (name, description, category, visibility, location, organizer, owner_id)
  values ('Food & Drinks',
    'Discover restaurants, cafés and bars — and find good company to enjoy them with.',
    'Food', 'public', 'Zug', 'By Valmia', v_owner_id)
  returning id into v_circle_id;
  insert into public.circle_members (circle_id, user_id, role, status)
  values (v_circle_id, v_owner_id, 'owner', 'active');

  insert into public.circles (name, description, category, visibility, location, organizer, owner_id)
  values ('Weekend Plans',
    'No plans yet? Find people for spontaneous adventures, day trips and weekend activities.',
    'Travel', 'public', 'Zug', 'By Valmia', v_owner_id)
  returning id into v_circle_id;
  insert into public.circle_members (circle_id, user_id, role, status)
  values (v_circle_id, v_owner_id, 'owner', 'active');

  insert into public.circles (name, description, category, visibility, location, organizer, owner_id)
  values ('Local Life & Culture',
    'Discover the local side of Zug — culture, traditions, markets, places and experiences beyond the expat bubble.',
    'Culture', 'public', 'Zug', 'By Valmia', v_owner_id)
  returning id into v_circle_id;
  insert into public.circle_members (circle_id, user_id, role, status)
  values (v_circle_id, v_owner_id, 'owner', 'active');

  -- ── BADEN ────────────────────────────────────────────────────────────────

  insert into public.circles (name, description, category, visibility, location, organizer, owner_id)
  values ('New in Baden',
    'Neu in Baden? Lerne Menschen kennen, entdecke die Stadt und finde unkompliziert Anschluss.',
    'Friends', 'public', 'Baden', 'By Valmia', v_owner_id)
  returning id into v_circle_id;
  insert into public.circle_members (circle_id, user_id, role, status)
  values (v_circle_id, v_owner_id, 'owner', 'active');

  insert into public.circles (name, description, category, visibility, location, organizer, owner_id)
  values ('Culture & Music',
    'Konzerte, Theater, Ausstellungen und kulturelle Entdeckungen in und rund um Baden.',
    'Culture', 'public', 'Baden', 'By Valmia', v_owner_id)
  returning id into v_circle_id;
  insert into public.circle_members (circle_id, user_id, role, status)
  values (v_circle_id, v_owner_id, 'owner', 'active');

  insert into public.circles (name, description, category, visibility, location, organizer, owner_id)
  values ('Sports & Outdoors',
    'Laufen, Wandern, Velofahren und gemeinsame Aktivitäten rund um Baden.',
    'Sport', 'public', 'Baden', 'By Valmia', v_owner_id)
  returning id into v_circle_id;
  insert into public.circle_members (circle_id, user_id, role, status)
  values (v_circle_id, v_owner_id, 'owner', 'active');

  insert into public.circles (name, description, category, visibility, location, organizer, owner_id)
  values ('Food & Apéro',
    'Restaurants, Cafés, Märkte und Feierabenddrinks – gemeinsam Baden geniessen.',
    'Food', 'public', 'Baden', 'By Valmia', v_owner_id)
  returning id into v_circle_id;
  insert into public.circle_members (circle_id, user_id, role, status)
  values (v_circle_id, v_owner_id, 'owner', 'active');

  insert into public.circles (name, description, category, visibility, location, organizer, owner_id)
  values ('Weekend Plans',
    'Noch nichts vor? Finde Leute für spontane Ausflüge, Aktivitäten und gemeinsame Wochenendpläne.',
    'Travel', 'public', 'Baden', 'By Valmia', v_owner_id)
  returning id into v_circle_id;
  insert into public.circle_members (circle_id, user_id, role, status)
  values (v_circle_id, v_owner_id, 'owner', 'active');

  insert into public.circles (name, description, category, visibility, location, organizer, owner_id)
  values ('Families',
    'Aktivitäten, Treffen und gemeinsame Unternehmungen für Familien in und rund um Baden.',
    'Friends', 'public', 'Baden', 'By Valmia', v_owner_id)
  returning id into v_circle_id;
  insert into public.circle_members (circle_id, user_id, role, status)
  values (v_circle_id, v_owner_id, 'owner', 'active');

end $$;

-- Verify
select name, category, location, created_at
from public.circles
where organizer = 'By Valmia'
order by location, created_at;
