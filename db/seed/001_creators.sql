-- 001 · forty fictional creators. Every number is derived deterministically from the handle (app._h), so the seed is
-- reproducible and internally consistent: audience shares, impressions, CTR and price all move together.
-- Names, headlines and bios are invented; there are no real people, companies or logos here.

create or replace function app._vertical_roles(v text) returns text[] language sql immutable as $$
  select case v
    when 'Security'   then array['Security leads','CTOs']
    when 'Devtools'   then array['CTOs','Product managers']
    when 'Fintech'    then array['Founders','CTOs']
    when 'Sales-tech' then array['Sales leaders','RevOps']
    when 'HR-tech'    then array['HR leaders','Founders']
    when 'Martech'    then array['Marketing leaders','Founders']
    when 'Data & AI'  then array['CTOs','Product managers']
    when 'Product'    then array['Product managers','Founders']
    when 'Legal-tech' then array['Founders','Security leads']
    else array['Founders','CTOs']
  end
$$;

insert into creators (handle, display_name, headline, bio, country, verticals, followers, rate_cents, audience,
                      imp_p25, imp_p50, imp_p75, ctr_p50, verified, is_sandbox)
select v.handle, v.name, v.headline,
       v.headline || '. Writes for B2B buyers in ' || array_to_string(v.verticals, ' and ') || '.',
       v.country, v.verticals, v.followers,
       greatest(4000, least(240000, (round(m.imp * (5 + 7 * app._h(v.handle || 'cpm')) / 1000.0) * 1000)::int)),
       jsonb_build_object('roles',
            (case when v.verticals[2] is not null
                  then jsonb_build_object((app._vertical_roles(v.verticals[2]))[1], round((0.08 + 0.14 * app._h(v.handle || 'r3'))::numeric, 2))
                  else '{}'::jsonb end)
            || jsonb_build_object((app._vertical_roles(v.verticals[1]))[2], round((0.15 + 0.20 * app._h(v.handle || 'r2'))::numeric, 2))
            || jsonb_build_object((app._vertical_roles(v.verticals[1]))[1], round((0.35 + 0.35 * app._h(v.handle || 'r1'))::numeric, 2)),
          'geo',
            jsonb_build_object((array_remove(array['France','Germany','UK','Netherlands','Spain','US','Nordics'], v.country))[1 + floor(app._h(v.handle || 'g2') * 5.999)::int],
                               round((0.10 + 0.15 * app._h(v.handle || 'g2s'))::numeric, 2))
            || jsonb_build_object(v.country, round((0.40 + 0.40 * app._h(v.handle || 'g1'))::numeric, 2))),
       round(m.imp * 0.7), m.imp, round(m.imp * 1.4), m.ctr,
       v.followers > 20000, true
from (values
  ('maya-okafor',    'Maya Okafor',      'Security lead, writes on SOC 2 for fintech',              'France',      array['Security','Fintech'],     41200),
  ('jonas-brandt',   'Jonas Brandt',     'DevSecOps engineer. Pipelines, secrets, audits',          'Germany',     array['Security','Devtools'],    18600),
  ('lea-marchetti',  'Léa Marchetti',    'Compliance operations for regulated startups',            'France',      array['Fintech','Security'],     63800),
  ('idris-paal',     'Idris Paal',       'Founder. Growth loops for early SaaS',                    'UK',          array['Martech','Sales-tech'],    9400),
  ('nora-wilkes',    'Nora Wilkes',      'Fractional CTO advising Series A teams',                  'US',          array['Devtools','Data & AI'],   96500),
  ('tomas-ferreira', 'Tomás Ferreira',   'RevOps, forecasting and the boring plumbing',             'Spain',       array['Sales-tech','Martech'],   27300),
  ('anika-rao',      'Anika Rao',        'People ops in scale-ups; hiring that holds up',           'Netherlands', array['HR-tech'],                34900),
  ('sven-lindqvist', 'Sven Lindqvist',   'Platform engineer. Developer experience',                 'Nordics',     array['Devtools'],               12800),
  ('clara-boucher',  'Clara Boucher',    'Product lead. Onboarding and activation for B2B',         'France',      array['Product','Devtools'],     22100),
  ('ravi-menon',     'Ravi Menon',       'Data platform engineer, dbt and warehouses',              'UK',          array['Data & AI','Devtools'],   31800),
  ('elin-holm',      'Elin Holm',        'Head of growth at a Nordic SaaS',                         'Nordics',     array['Martech','Sales-tech'],   15600),
  ('pablo-duarte',   'Pablo Duarte',     'Sales leader. Outbound that respects the reader',         'Spain',       array['Sales-tech'],             47200),
  ('chloe-vance',    'Chloé Vance',      'CISO stories for growing companies',                      'UK',          array['Security'],               58900),
  ('mateo-rossi',    'Mateo Rossi',      'Legal engineer. Contracts for software teams',            'Spain',       array['Legal-tech'],              8700),
  ('freya-jensen',   'Freya Jensen',     'Recruiter turned talent strategist',                      'Nordics',     array['HR-tech'],                26400),
  ('kwame-asante',   'Kwame Asante',     'Fintech founder. Payments infrastructure',                'UK',          array['Fintech','Devtools'],     73400),
  ('sofia-lindgren', 'Sofia Lindgren',   'ML engineer writing about evaluation',                    'Nordics',     array['Data & AI'],              39600),
  ('amir-haddad',    'Amir Haddad',      'RevOps consultant. Attribution without tears',            'France',      array['Sales-tech','Martech'],   19300),
  ('julia-neumann',  'Julia Neumann',    'Product manager, B2B marketplaces',                       'Germany',     array['Product'],                24800),
  ('oskar-bakker',   'Oskar Bakker',     'SaaS founder on pricing and packaging',                   'Netherlands', array['Martech','Product'],      21500),
  ('priya-nair',     'Priya Nair',       'Engineering manager. Teams that ship',                    'UK',          array['Devtools'],               52700),
  ('lucas-moreau',   'Lucas Moreau',     'Growth marketer for developer tools',                     'France',      array['Martech','Devtools'],     17100),
  ('hanna-vogel',    'Hanna Vogel',      'Data protection officer, GDPR in practice',               'Germany',     array['Legal-tech','Security'],  13900),
  ('diego-alvarez',  'Diego Alvarez',    'Payments product manager',                                'Spain',       array['Fintech','Product'],      29700),
  ('ines-carvalho',  'Inês Carvalho',    'HR business partner, people analytics',                   'Spain',       array['HR-tech','Data & AI'],    11200),
  ('tobias-krause',  'Tobias Krause',    'Security researcher, application security',               'Germany',     array['Security','Devtools'],    44300),
  ('mei-lin-chen',   'Mei Lin Chen',     'Founder of a vertical SaaS for clinics',                  'US',          array['Product','Martech'],      33100),
  ('andre-silva',    'André Silva',      'Sales engineer. Demos that convert',                      'US',          array['Sales-tech','Devtools'],  38200),
  ('karin-olsen',    'Karin Olsen',      'CFO voice for startups; metrics that matter',             'Nordics',     array['Fintech'],                28600),
  ('samir-kader',    'Samir Kader',      'Cloud architect, cost and reliability',                   'France',      array['Devtools','Data & AI'],   36400),
  ('vera-petrova',   'Vera Petrova',     'Chief of staff at a scale-up; operating cadence',         'Germany',     array['Product','Sales-tech'],   14700),
  ('jack-mercer',    'Jack Mercer',      'Marketing leader, B2B brand and demand',                  'UK',          array['Martech'],                68900),
  ('naomi-fisher',   'Naomi Fisher',     'Founder coach for first-time CEOs',                       'US',          array['Martech','HR-tech'],     122000),
  ('louis-dupont',   'Louis Dupont',     'Startup lawyer. Term sheets, plainly',                    'France',      array['Legal-tech','Fintech'],   25900),
  ('greta-lund',     'Greta Lund',       'Recruitment marketing for tech teams',                    'Nordics',     array['HR-tech','Martech'],       6100),
  ('marco-bianchi',  'Marco Bianchi',    'Analytics engineer, metrics layers',                      'Spain',       array['Data & AI'],              16200),
  ('yara-hassan',    'Yara Hassan',      'Product designer for B2B dashboards',                     'Netherlands', array['Product'],                19800),
  ('felix-braun',    'Felix Braun',      'Open-source maintainer, developer relations',             'Germany',     array['Devtools'],               41800),
  ('ada-okonkwo',    'Ada Okonkwo',      'Sales leadership for second-time founders',               'UK',          array['Sales-tech'],             83200),
  ('leo-grant',      'Leo Grant',        'Early-stage creator on B2B basics',                       'US',          array['Martech'],                 1200)
) as v(handle, name, headline, country, verticals, followers)
cross join lateral (
  select round(v.followers * (0.14 + 0.22 * app._h(v.handle || 'imp')))::int as imp,
         round((0.7 + 1.5 * app._h(v.handle || 'ctr'))::numeric, 2)          as ctr
) m
on conflict (handle) do nothing;

-- recent posts: the basis for each creator's public kit and their projection
insert into creator_posts (creator_id, hook, impressions, clicks, published_at)
select c.id,
       replace((array[
         'What nobody tells you about % in year one','Three mistakes we made with % and what fixed them',
         'A short checklist for anyone evaluating % tools','Why our % process got simpler when we deleted half of it',
         'The metric I stopped tracking in % (and what replaced it)','A teardown of a % decision that looked obvious',
         'What I would tell my past self about %','The unglamorous part of % that decides everything',
         'Questions I ask before buying anything in %','How a small team handles % without the overhead',
         'A lesson from a % project that went sideways','The % trend I think is overrated'
       ])[1 + floor(app._h(c.handle || 'h' || i::text) * 11.999)::int], '%', lower(c.verticals[1])),
       round(c.imp_p50 * (0.5 + 1.0 * app._h(c.handle || 'pi' || i::text)))::int,
       round(c.imp_p50 * (0.5 + 1.0 * app._h(c.handle || 'pi' || i::text)) * c.ctr_p50 / 100.0 * (0.7 + 0.6 * app._h(c.handle || 'pc' || i::text)))::int,
       now() - (i * 8 + floor(app._h(c.handle || 'pd' || i::text) * 6)) * interval '1 day'
from creators c cross join generate_series(1, 10) i
where not exists (select 1 from creator_posts p where p.creator_id = c.id);
