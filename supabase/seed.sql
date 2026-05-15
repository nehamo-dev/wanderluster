-- ============================================================
-- Wanderluster seed — run AFTER schema.sql
-- Replace <your-user-id> with your actual auth.users id
-- (find it in Supabase Dashboard → Authentication → Users)
-- ============================================================

do $$
declare
  uid        uuid := '<your-user-id>';  -- ← paste your user id here
  tokyo_id   uuid := gen_random_uuid();
  salz_id    uuid := gen_random_uuid();
  yose_id    uuid := gen_random_uuid();
  d          uuid;
begin

-- ── Tokyo ────────────────────────────────────────────────────
insert into folios (id, user_id, slug, title, destination, country, dates, duration, season, vibe, teaser, palette, visa)
values (
  tokyo_id, uid, 'tokyo', 'Cherry blossoms', 'Tokyo', 'Japan',
  'Mar 25 – Apr 5', '10 days', 'Late spring', 'Culture · Food · Slow mornings',
  'Slow mornings under the sakura, koban-quiet alleys, kaiseki at dusk.',
  '{"a":"#f4d8d4","b":"#e8a6a0","c":"#3a2a32","accent":"#a8624c"}',
  '{"label":"Japan e-Visa","status":"Required for some passports — pre-filled"}'
);

-- Day 1
insert into folio_days (id, folio_id, n, date, label, confirmed) values (d := gen_random_uuid(), tokyo_id, 1, 'Tue · Mar 25', 'Arrival', true);
insert into folio_events (day_id, folio_id, kind, time, title, meta, confirmed, sort_order) values
  (d, tokyo_id, 'flight',  '15:40', 'UA 837 · SEA → NRT',       'Confirmation XK29TF',     true,  0),
  (d, tokyo_id, 'hotel',   '19:00', 'Hotel K5, Nihonbashi',      'Check-in · 3 nights',     true,  1);

-- Day 2
insert into folio_days (id, folio_id, n, date, label, confirmed) values (d := gen_random_uuid(), tokyo_id, 2, 'Wed · Mar 26', 'Senso-ji at dawn', false);
insert into folio_events (day_id, folio_id, kind, time, title, meta, confirmed, sort_order) values
  (d, tokyo_id, 'activity', '05:30', 'Senso-ji — dawn visit',         'Asakusa · before crowds',       false, 0),
  (d, tokyo_id, 'food',     '08:30', 'Yanaka coffee & tamago-sando',  'Walk Yanaka old town',          false, 1),
  (d, tokyo_id, 'food',     '19:30', 'Ichiran Shibuya',               'Late dinner · counter seats',   false, 2);

-- Day 3
insert into folio_days (id, folio_id, n, date, label, confirmed) values (d := gen_random_uuid(), tokyo_id, 3, 'Thu · Mar 27', 'Shinjuku Gyoen', false);
insert into folio_events (day_id, folio_id, kind, time, title, meta, confirmed, sort_order) values
  (d, tokyo_id, 'activity', '10:00', 'Shinjuku Gyoen — hanami picnic', 'Peak bloom forecast +/- 2 days', false, 0),
  (d, tokyo_id, 'food',     '20:00', 'Narisawa',                       '2 guests · confirmed',           true,  1);

-- Day 4 (empty)
insert into folio_days (folio_id, n, date, label, empty) values (tokyo_id, 4, 'Fri · Mar 28', 'Open day', true);

-- Day 5
insert into folio_days (id, folio_id, n, date, label) values (d := gen_random_uuid(), tokyo_id, 5, 'Sat · Mar 29', 'teamLab Planets');
insert into folio_events (day_id, folio_id, kind, time, title, meta, confirmed, sort_order) values
  (d, tokyo_id, 'activity', '11:00', 'teamLab Planets',          'Toyosu · timed entry',         true,  0),
  (d, tokyo_id, 'food',     '13:30', 'Tsukiji Outer Market',     'Uni rice bowl + tamago',       false, 1);

-- Day 6
insert into folio_days (id, folio_id, n, date, label) values (d := gen_random_uuid(), tokyo_id, 6, 'Sun · Mar 30', 'Nakameguro canal');
insert into folio_events (day_id, folio_id, kind, time, title, meta, confirmed, sort_order) values
  (d, tokyo_id, 'activity', '14:00', 'Nakameguro canal walk', 'Sakura tunnel · late afternoon light', false, 0);

-- Day 7
insert into folio_days (id, folio_id, n, date, label) values (d := gen_random_uuid(), tokyo_id, 7, 'Mon · Mar 31', 'Day trip · Nikko');
insert into folio_events (day_id, folio_id, kind, time, title, meta, confirmed, sort_order) values
  (d, tokyo_id, 'flight',   '07:42', 'Tobu Spacia → Tobu-Nikko', '1h 50m · seat 7A',          true,  0),
  (d, tokyo_id, 'activity', '10:30', 'Toshogu shrine complex',   'Cedar avenue · half day',   false, 1);

-- Day 8 (empty)
insert into folio_days (folio_id, n, date, label, empty) values (tokyo_id, 8, 'Tue · Apr 1', 'Open day', true);

-- Day 9
insert into folio_days (id, folio_id, n, date, label) values (d := gen_random_uuid(), tokyo_id, 9, 'Wed · Apr 2', 'Yanaka & Nezu');
insert into folio_events (day_id, folio_id, kind, time, title, meta, confirmed, sort_order) values
  (d, tokyo_id, 'activity', '09:30', 'Yanaka cemetery walk', 'Old Tokyo — quiet morning', false, 0);

-- Day 10
insert into folio_days (id, folio_id, n, date, label, confirmed) values (d := gen_random_uuid(), tokyo_id, 10, 'Thu · Apr 3', 'Departure', true);
insert into folio_events (day_id, folio_id, kind, time, title, meta, confirmed, sort_order) values
  (d, tokyo_id, 'flight', '17:20', 'UA 838 · NRT → SEA', 'Confirmation XK29TF', true, 0);

insert into folio_docs (folio_id, name, state) values
  (tokyo_id, 'Japan e-Visa',            'awaiting upload'),
  (tokyo_id, 'UA 837 boarding pass',    'attached'),
  (tokyo_id, 'Hotel K5 reservation',    'attached');


-- ── Salzburg ─────────────────────────────────────────────────
insert into folios (id, user_id, slug, title, destination, country, dates, duration, season, vibe, teaser, palette, visa)
values (
  salz_id, uid, 'salzburg', 'Christmas markets', 'Salzburg', 'Austria',
  'Dec 18 – Dec 26', '8 days', 'Deep winter', 'Markets · Music · Mountain air',
  'Glühwein in snow-still squares, fortress bells, lanterns at four.',
  '{"a":"#2a3a2c","b":"#5a3a2a","c":"#0f1a14","accent":"#c9a961"}',
  '{"label":"Schengen visa","status":"Auto-surfaced for non-EU passports"}'
);

insert into folio_days (id, folio_id, n, date, label, confirmed) values (d := gen_random_uuid(), salz_id, 1, 'Thu · Dec 18', 'Arrival', true);
insert into folio_events (day_id, folio_id, kind, time, title, meta, confirmed, sort_order) values
  (d, salz_id, 'flight', '10:20', 'OS 88 · JFK → VIE',          'Confirmation P3Q4MN',  true, 0),
  (d, salz_id, 'hotel',  '17:00', 'Hotel Goldgasse, Altstadt',   'Check-in · 8 nights',  true, 1);

insert into folio_days (id, folio_id, n, date, label) values (d := gen_random_uuid(), salz_id, 2, 'Fri · Dec 19', 'Altstadt markets');
insert into folio_events (day_id, folio_id, kind, time, title, meta, confirmed, sort_order) values
  (d, salz_id, 'activity', '11:00', 'Christkindlmarkt — Residenzplatz', 'Glühwein · roasted chestnuts', false, 0),
  (d, salz_id, 'food',     '19:30', 'Goldener Hirsch',                  'Tafelspitz · 8pm',            false, 1);

insert into folio_days (id, folio_id, n, date, label) values (d := gen_random_uuid(), salz_id, 3, 'Sat · Dec 20', 'Hohensalzburg');
insert into folio_events (day_id, folio_id, kind, time, title, meta, confirmed, sort_order) values
  (d, salz_id, 'activity', '10:00', 'Hohensalzburg Fortress', 'Funicular up · walk down', false, 0),
  (d, salz_id, 'activity', '15:00', 'Mozart Geburtshaus',     'Getreidegasse 9',          false, 1);

insert into folio_days (folio_id, n, date, label, empty) values (salz_id, 4, 'Sun · Dec 21', 'Open day', true);

insert into folio_days (id, folio_id, n, date, label) values (d := gen_random_uuid(), salz_id, 5, 'Mon · Dec 22', 'Hallstatt day trip');
insert into folio_events (day_id, folio_id, kind, time, title, meta, confirmed, sort_order) values
  (d, salz_id, 'flight',   '08:15', 'ÖBB → Hallstatt',          '2h 20m · seat 12C',           false, 0),
  (d, salz_id, 'activity', '11:30', 'Lakeside walk & salt mine', 'Half day · return 17:00',     false, 1);

insert into folio_days (id, folio_id, n, date, label) values (d := gen_random_uuid(), salz_id, 6, 'Tue · Dec 23', 'Vienna day trip');
insert into folio_events (day_id, folio_id, kind, time, title, meta, confirmed, sort_order) values
  (d, salz_id, 'flight',   '07:55', 'Railjet → Vienna',                  '2h 30m',         false, 0),
  (d, salz_id, 'activity', '11:00', 'Christmas Village at Schönbrunn',   'Plus Belvedere', false, 1);

insert into folio_days (id, folio_id, n, date, label) values (d := gen_random_uuid(), salz_id, 7, 'Wed · Dec 24', 'Christmas Eve');
insert into folio_events (day_id, folio_id, kind, time, title, meta, confirmed, sort_order) values
  (d, salz_id, 'activity', '22:30', 'Midnight mass — Salzburger Dom', 'Arrive 30 min early', false, 0);

insert into folio_days (folio_id, n, date, label, empty) values (salz_id, 8, 'Thu · Dec 25', 'Quiet morning', true);

insert into folio_docs (folio_id, name, state) values
  (salz_id, 'Schengen visa',     'eligible — info attached'),
  (salz_id, 'OS 88 boarding pass', 'attached');


-- ── Yosemite ─────────────────────────────────────────────────
insert into folios (id, user_id, slug, title, destination, country, dates, duration, season, vibe, teaser, palette)
values (
  yose_id, uid, 'yosemite', 'Summer in the valley', 'Yosemite', 'California',
  'Jun 20 – Jun 27', '7 days', 'High summer', 'Trails · Granite · Sky',
  'Granite and sky, sequoias older than countries, river-cold dawns.',
  '{"a":"#c9a96b","b":"#5a6b4a","c":"#2a2620","accent":"#a8624c"}'
);

insert into folio_days (id, folio_id, n, date, label, confirmed) values (d := gen_random_uuid(), yose_id, 1, 'Fri · Jun 20', 'Arrival — valley floor', true);
insert into folio_events (day_id, folio_id, kind, time, title, meta, confirmed, alert, sort_order) values
  (d, yose_id, 'flight', '11:00', 'Drive · SFO → Yosemite Village', '4h · stop at Groveland',              true,  false, 0),
  (d, yose_id, 'hotel',  '17:30', 'The Ahwahnee',                   'Check-in · 4 nights',                 true,  false, 1),
  (d, yose_id, 'flag',   null,    'Half Dome permit — required',     'Wayfinder flagged · apply by Jun 14', false, true,  2);

insert into folio_days (id, folio_id, n, date, label) values (d := gen_random_uuid(), yose_id, 2, 'Sat · Jun 21', 'Valley floor loop');
insert into folio_events (day_id, folio_id, kind, time, title, meta, confirmed, sort_order) values
  (d, yose_id, 'activity', '08:00', 'Valley floor bike loop', '12 mi · easy · rentals at Curry', false, 0),
  (d, yose_id, 'activity', '19:00', 'Glacier Point — sunset',  'Drive up · golden hour',         false, 1);

insert into folio_days (id, folio_id, n, date, label) values (d := gen_random_uuid(), yose_id, 3, 'Sun · Jun 22', 'Half Dome');
insert into folio_events (day_id, folio_id, kind, time, title, meta, confirmed, sort_order) values
  (d, yose_id, 'activity', '04:30', 'Half Dome cable hike', '14–16 mi · permit holders only', false, 0);

insert into folio_days (folio_id, n, date, label, empty) values (yose_id, 4, 'Mon · Jun 23', 'Recovery day', true);

insert into folio_days (id, folio_id, n, date, label) values (d := gen_random_uuid(), yose_id, 5, 'Tue · Jun 24', 'Tuolumne Meadows');
insert into folio_events (day_id, folio_id, kind, time, title, meta, confirmed, sort_order) values
  (d, yose_id, 'activity', '09:00', 'Tuolumne Meadows',      'Tioga Pass · 1h drive',      false, 0),
  (d, yose_id, 'activity', '14:00', 'Cathedral Lakes walk',  '7 mi out-and-back',          false, 1);

insert into folio_days (id, folio_id, n, date, label) values (d := gen_random_uuid(), yose_id, 6, 'Wed · Jun 25', 'Mariposa Grove');
insert into folio_events (day_id, folio_id, kind, time, title, meta, confirmed, sort_order) values
  (d, yose_id, 'activity', '10:00', 'Mariposa Grove of giant sequoias', 'Grizzly Giant · half day', false, 0);

insert into folio_days (id, folio_id, n, date, label, confirmed) values (d := gen_random_uuid(), yose_id, 7, 'Thu · Jun 26', 'Departure', true);
insert into folio_events (day_id, folio_id, kind, time, title, meta, confirmed, sort_order) values
  (d, yose_id, 'flight', '14:00', 'Drive · Yosemite → SFO', '4h', true, 0);

insert into folio_docs (folio_id, name, state) values
  (yose_id, 'Half Dome permit application', 'flagged — action required'),
  (yose_id, 'Ahwahnee reservation',         'attached');


-- ── Wishlist ─────────────────────────────────────────────────
insert into wishlist (user_id, slug, name, season, vibe, flight, visa, budget, palette) values
  (uid, 'patagonia', 'Patagonia',        'Nov – Mar', 'Adventure', '14h', 'Easy',       '$$$', '{"a":"#8a9aa0","b":"#3a4248","c":"#1a1f24"}'),
  (uid, 'kyoto',     'Kyoto temples',    'Apr · Nov', 'Culture',   '11h', 'Easy',       '$$',  '{"a":"#c4a890","b":"#8a5a44","c":"#2a1e16"}'),
  (uid, 'lofoten',   'Lofoten',          'Jun · Sep', 'Adventure', '13h', 'Schengen',   '$$$', '{"a":"#a8b8c0","b":"#3a5a6a","c":"#0f1a22"}'),
  (uid, 'marrakech', 'Marrakech',        'Mar · Oct', 'Culture',   '9h',  'On arrival', '$$',  '{"a":"#d4956b","b":"#a8482a","c":"#2a1a14"}');

end $$;
