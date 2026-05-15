import type { Folio, WishlistItem } from '../types';

export const FOLIOS: Record<string, Folio> = {
  tokyo: {
    id: 'tokyo',
    title: 'Cherry blossoms',
    destination: 'Tokyo',
    country: 'Japan',
    dates: 'Mar 25 – Apr 5',
    duration: '10 days',
    season: 'Late spring',
    vibe: 'Culture · Food · Slow mornings',
    palette: { a: '#f4d8d4', b: '#e8a6a0', c: '#3a2a32', accent: '#a8624c' },
    visa: { label: 'Japan e-Visa', status: 'Required for some passports — pre-filled' },
    teaser: 'Slow mornings under the sakura, koban-quiet alleys, kaiseki at dusk.',
    days: [
      { n: 1, date: 'Tue · Mar 25', label: 'Arrival', confirmed: true, events: [
        { kind: 'flight', time: '15:40', title: 'UA 837 · SEA → NRT', meta: 'Confirmation XK29TF', confirmed: true },
        { kind: 'hotel', time: '19:00', title: 'Hotel K5, Nihonbashi', meta: 'Check-in · 3 nights', confirmed: true },
      ]},
      { n: 2, date: 'Wed · Mar 26', label: 'Senso-ji at dawn', confirmed: false, events: [
        { kind: 'activity', time: '05:30', title: 'Senso-ji — dawn visit', meta: 'Asakusa · before crowds', confirmed: false },
        { kind: 'food', time: '08:30', title: 'Yanaka coffee & tamago-sando', meta: 'Walk Yanaka old town', confirmed: false },
        { kind: 'food', time: '19:30', title: 'Ichiran Shibuya', meta: 'Late dinner · counter seats', confirmed: false },
      ]},
      { n: 3, date: 'Thu · Mar 27', label: 'Shinjuku Gyoen', confirmed: false, events: [
        { kind: 'activity', time: '10:00', title: 'Shinjuku Gyoen — hanami picnic', meta: 'Peak bloom forecast +/- 2 days', confirmed: false },
        { kind: 'food', time: '20:00', title: 'Narisawa', meta: '2 guests · confirmed', confirmed: true },
      ]},
      { n: 4, date: 'Fri · Mar 28', label: 'Open day', empty: true, events: [] },
      { n: 5, date: 'Sat · Mar 29', label: 'teamLab Planets', confirmed: false, events: [
        { kind: 'activity', time: '11:00', title: 'teamLab Planets', meta: 'Toyosu · timed entry', confirmed: true },
        { kind: 'food', time: '13:30', title: 'Tsukiji Outer Market', meta: 'Uni rice bowl + tamago', confirmed: false },
      ]},
      { n: 6, date: 'Sun · Mar 30', label: 'Nakameguro canal', confirmed: false, events: [
        { kind: 'activity', time: '14:00', title: 'Nakameguro canal walk', meta: 'Sakura tunnel · late afternoon light', confirmed: false },
      ]},
      { n: 7, date: 'Mon · Mar 31', label: 'Day trip · Nikko', confirmed: false, events: [
        { kind: 'flight', time: '07:42', title: 'Tobu Spacia → Tobu-Nikko', meta: '1h 50m · seat 7A', confirmed: true },
        { kind: 'activity', time: '10:30', title: 'Toshogu shrine complex', meta: 'Cedar avenue · half day', confirmed: false },
      ]},
      { n: 8, date: 'Tue · Apr 1', label: 'Open day', empty: true, events: [] },
      { n: 9, date: 'Wed · Apr 2', label: 'Yanaka & Nezu', confirmed: false, events: [
        { kind: 'activity', time: '09:30', title: 'Yanaka cemetery walk', meta: 'Old Tokyo — quiet morning', confirmed: false },
      ]},
      { n: 10, date: 'Thu · Apr 3', label: 'Departure', confirmed: true, events: [
        { kind: 'flight', time: '17:20', title: 'UA 838 · NRT → SEA', meta: 'Confirmation XK29TF', confirmed: true },
      ]},
    ],
    docs: [
      { name: 'Japan e-Visa', state: 'awaiting upload' },
      { name: 'UA 837 boarding pass', state: 'attached' },
      { name: 'Hotel K5 reservation', state: 'attached' },
    ],
  },

  salzburg: {
    id: 'salzburg',
    title: 'Christmas markets',
    destination: 'Salzburg',
    country: 'Austria',
    dates: 'Dec 18 – Dec 26',
    duration: '8 days',
    season: 'Deep winter',
    vibe: 'Markets · Music · Mountain air',
    palette: { a: '#2a3a2c', b: '#5a3a2a', c: '#0f1a14', accent: '#c9a961' },
    visa: { label: 'Schengen visa', status: 'Auto-surfaced for non-EU passports' },
    teaser: 'Glühwein in snow-still squares, fortress bells, lanterns at four.',
    days: [
      { n: 1, date: 'Thu · Dec 18', label: 'Arrival', confirmed: true, events: [
        { kind: 'flight', time: '10:20', title: 'OS 88 · JFK → VIE', meta: 'Confirmation P3Q4MN', confirmed: true },
        { kind: 'hotel', time: '17:00', title: 'Hotel Goldgasse, Altstadt', meta: 'Check-in · 8 nights', confirmed: true },
      ]},
      { n: 2, date: 'Fri · Dec 19', label: 'Altstadt markets', confirmed: false, events: [
        { kind: 'activity', time: '11:00', title: 'Christkindlmarkt — Residenzplatz', meta: 'Glühwein · roasted chestnuts', confirmed: false },
        { kind: 'food', time: '19:30', title: 'Goldener Hirsch', meta: 'Tafelspitz · 8pm', confirmed: false },
      ]},
      { n: 3, date: 'Sat · Dec 20', label: 'Hohensalzburg', confirmed: false, events: [
        { kind: 'activity', time: '10:00', title: 'Hohensalzburg Fortress', meta: 'Funicular up · walk down', confirmed: false },
        { kind: 'activity', time: '15:00', title: 'Mozart Geburtshaus', meta: 'Getreidegasse 9', confirmed: false },
      ]},
      { n: 4, date: 'Sun · Dec 21', label: 'Open day', empty: true, events: [] },
      { n: 5, date: 'Mon · Dec 22', label: 'Hallstatt day trip', confirmed: false, events: [
        { kind: 'flight', time: '08:15', title: 'ÖBB → Hallstatt', meta: '2h 20m · seat 12C', confirmed: false },
        { kind: 'activity', time: '11:30', title: 'Lakeside walk & salt mine', meta: 'Half day · return 17:00', confirmed: false },
      ]},
      { n: 6, date: 'Tue · Dec 23', label: 'Vienna day trip', confirmed: false, events: [
        { kind: 'flight', time: '07:55', title: 'Railjet → Vienna', meta: '2h 30m', confirmed: false },
        { kind: 'activity', time: '11:00', title: 'Christmas Village at Schönbrunn', meta: 'Plus Belvedere', confirmed: false },
      ]},
      { n: 7, date: 'Wed · Dec 24', label: 'Christmas Eve', confirmed: false, events: [
        { kind: 'activity', time: '22:30', title: 'Midnight mass — Salzburger Dom', meta: 'Arrive 30 min early', confirmed: false },
      ]},
      { n: 8, date: 'Thu · Dec 25', label: 'Quiet morning', empty: true, events: [] },
    ],
    docs: [
      { name: 'Schengen visa', state: 'eligible — info attached' },
      { name: 'OS 88 boarding pass', state: 'attached' },
    ],
  },

  yosemite: {
    id: 'yosemite',
    title: 'Summer in the valley',
    destination: 'Yosemite',
    country: 'California',
    dates: 'Jun 20 – Jun 27',
    duration: '7 days',
    season: 'High summer',
    vibe: 'Trails · Granite · Sky',
    palette: { a: '#c9a96b', b: '#5a6b4a', c: '#2a2620', accent: '#a8624c' },
    visa: null,
    teaser: 'Granite and sky, sequoias older than countries, river-cold dawns.',
    days: [
      { n: 1, date: 'Fri · Jun 20', label: 'Arrival — valley floor', confirmed: true, events: [
        { kind: 'flight', time: '11:00', title: 'Drive · SFO → Yosemite Village', meta: '4h · stop at Groveland', confirmed: true },
        { kind: 'hotel', time: '17:30', title: 'The Ahwahnee', meta: 'Check-in · 4 nights', confirmed: true },
        { kind: 'flag', time: null, title: 'Half Dome permit — required', meta: 'Wayfinder flagged · apply by Jun 14', confirmed: false, alert: true },
      ]},
      { n: 2, date: 'Sat · Jun 21', label: 'Valley floor loop', confirmed: false, events: [
        { kind: 'activity', time: '08:00', title: 'Valley floor bike loop', meta: '12 mi · easy · rentals at Curry', confirmed: false },
        { kind: 'activity', time: '19:00', title: 'Glacier Point — sunset', meta: 'Drive up · golden hour', confirmed: false },
      ]},
      { n: 3, date: 'Sun · Jun 22', label: 'Half Dome', confirmed: false, events: [
        { kind: 'activity', time: '04:30', title: 'Half Dome cable hike', meta: '14–16 mi · permit holders only', confirmed: false },
      ]},
      { n: 4, date: 'Mon · Jun 23', label: 'Recovery day', empty: true, events: [] },
      { n: 5, date: 'Tue · Jun 24', label: 'Tuolumne Meadows', confirmed: false, events: [
        { kind: 'activity', time: '09:00', title: 'Tuolumne Meadows', meta: 'Tioga Pass · 1h drive', confirmed: false },
        { kind: 'activity', time: '14:00', title: 'Cathedral Lakes walk', meta: '7 mi out-and-back', confirmed: false },
      ]},
      { n: 6, date: 'Wed · Jun 25', label: 'Mariposa Grove', confirmed: false, events: [
        { kind: 'activity', time: '10:00', title: 'Mariposa Grove of giant sequoias', meta: 'Grizzly Giant · half day', confirmed: false },
      ]},
      { n: 7, date: 'Thu · Jun 26', label: 'Departure', confirmed: true, events: [
        { kind: 'flight', time: '14:00', title: 'Drive · Yosemite → SFO', meta: '4h', confirmed: true },
      ]},
    ],
    docs: [
      { name: 'Half Dome permit application', state: 'flagged — action required' },
      { name: 'Ahwahnee reservation', state: 'attached' },
    ],
  },
};

export const FOLIO_LIST = Object.values(FOLIOS);

export const WISHLIST: WishlistItem[] = [
  { id: 'patagonia', name: 'Patagonia', season: 'Nov – Mar', vibe: 'Adventure', flight: '14h', visa: 'Easy', budget: '$$$', palette: { a: '#8a9aa0', b: '#3a4248', c: '#1a1f24' } },
  { id: 'kyoto', name: 'Kyoto temples', season: 'Apr · Nov', vibe: 'Culture', flight: '11h', visa: 'Easy', budget: '$$', palette: { a: '#c4a890', b: '#8a5a44', c: '#2a1e16' } },
  { id: 'rome', name: 'Rome', season: 'Apr · Oct', vibe: 'Culture', flight: '10h', visa: 'Schengen', budget: '$$', palette: { a: '#c8b090', b: '#8a5a30', c: '#1a1208' } },
  { id: 'marrakech', name: 'Marrakech', season: 'Mar · Oct', vibe: 'Culture', flight: '9h', visa: 'On arrival', budget: '$$', palette: { a: '#d4956b', b: '#a8482a', c: '#2a1a14' } },
];

export const WAYFINDER_GREETINGS: Record<string, string> = {
  tokyo: 'Sakura forecast looks favorable for Mar 28. I\'ve held a quiet morning at Yanaka.',
  salzburg: 'Markets close at 8 on Dec 24. I\'ve marked midnight mass and kept the morning open.',
  yosemite: 'Half Dome permits open Apr 1. I\'ll remind you 48 hours before.',
};
