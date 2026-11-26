import type { Story, StoryChapter, StoryComment } from '../types/story';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;
const BASE_NOW = Date.now();

export interface StarterStoryBundle {
  story: Story;
  chapters: StoryChapter[];
  comments: StoryComment[];
}

export const STARTER_STORY_BUNDLES: StarterStoryBundle[] = [
  {
    story: {
      id: 'starter_clockmaker_hill',
      title: 'The Clockmaker of Kandy - Part 7',
      excerpt: 'Read all chapters of the misty hill-country mystery unfolding behind the old station.',
      category: 'Mystery',
      authorId: 'starter_author_1',
      authorName: 'Katha Desk',
      authorPhotoURL: '',
      authorVerified: true,
      views: 2400,
      chapterCount: 2,
      status: 'published',
      createdAtMs: BASE_NOW - 11 * HOUR,
      updatedAtMs: BASE_NOW - 11 * HOUR,
      source: 'starter',
    },
    chapters: [
      {
        id: 'ch_1',
        storyId: 'starter_clockmaker_hill',
        authorId: 'starter_author_1',
        status: 'published',
        chapterNumber: 1,
        title: 'Part 1: The Stopped Pendulum',
        content:
          'Every brass pendulum inside Ratnayake Watchworks fell silent at exactly 6:14 in the evening. Rain tapped steadily against the timber shutters while a single pocket watch on the oak counter continued ticking backward.\n\nArjun lifted the silver lid with a jeweler’s loupe. Inside the casing, where a serial stamp should have rested, someone had engraved the timetable of the night mail train to Nanu Oya.',
        createdAtMs: BASE_NOW - 11 * HOUR,
        updatedAtMs: BASE_NOW - 11 * HOUR,
      },
      {
        id: 'ch_2',
        storyId: 'starter_clockmaker_hill',
        authorId: 'starter_author_1',
        status: 'published',
        chapterNumber: 2,
        title: 'Part 2: Platform Three',
        content:
          'By dusk the station mist had swallowed the signal lamps. Arjun stood beside the iron water column clutching the ticking watch, waiting for the guard who had left it on the workbench three winters earlier.\n\nWhen the lantern swung out from the brake van, the watch finally chimed once—and the missing brass key slid loose from behind its dial.',
        createdAtMs: BASE_NOW - 10 * HOUR,
        updatedAtMs: BASE_NOW - 10 * HOUR,
      },
    ],
    comments: [
      {
        id: 'cmt_1',
        storyId: 'starter_clockmaker_hill',
        authorId: 'starter_reader_1',
        authorName: 'Dinithi R.',
        body: 'The hill-country railway atmosphere feels so vivid. Looking forward to Part 8.',
        status: 'visible',
        createdAtMs: BASE_NOW - 4 * HOUR,
      },
    ],
  },
  {
    story: {
      id: 'starter_monsoon_notebook',
      title: 'Monsoon Notebook - Episode 14',
      excerpt: 'Everyday letters and quiet sketches from a coastal boarding house during May rains.',
      category: 'Slice of Life',
      authorId: 'starter_author_1',
      authorName: 'Katha Desk',
      authorPhotoURL: '',
      authorVerified: true,
      views: 1800,
      chapterCount: 2,
      status: 'published',
      createdAtMs: BASE_NOW - 17 * HOUR,
      updatedAtMs: BASE_NOW - 17 * HOUR,
      source: 'starter',
    },
    chapters: [
      {
        id: 'ch_1',
        storyId: 'starter_monsoon_notebook',
        authorId: 'starter_author_1',
        status: 'published',
        chapterNumber: 1,
        title: 'Part 1: Tea on the Veranda',
        content:
          'When the southwest wind bends the coconut fronds low over the lane, the whole boarding house gathers on the stone veranda with enamel mugs of ginger tea. Nobody hurries during a monsoon afternoon.\n\nOld Mr. Fernando brings out his radio, and we listen to shipping forecasts while counting how many umbrellas turn inside out at the bus halt.',
        createdAtMs: BASE_NOW - 17 * HOUR,
        updatedAtMs: BASE_NOW - 17 * HOUR,
      },
      {
        id: 'ch_2',
        storyId: 'starter_monsoon_notebook',
        authorId: 'starter_author_1',
        status: 'published',
        chapterNumber: 2,
        title: 'Part 2: Clear Sky at Dusk',
        content:
          'Just before sunset the cloud curtain tore open in a band of pale amber. Puddles along the gravel road mirrored the palms upside down, and the baker’s bicycle bell echoed down the lane once again.',
        createdAtMs: BASE_NOW - 16 * HOUR,
        updatedAtMs: BASE_NOW - 16 * HOUR,
      },
    ],
    comments: [],
  },
  {
    story: {
      id: 'starter_glass_harbour',
      title: 'Lanterns Over Galle Fort - 35',
      excerpt: 'A multi-part historical drama set along the ramparts of the southern sea wall.',
      category: 'Drama',
      authorId: 'starter_author_1',
      authorName: 'Katha Desk',
      authorPhotoURL: '',
      authorVerified: true,
      views: 4800,
      chapterCount: 2,
      status: 'published',
      createdAtMs: BASE_NOW - 1 * DAY,
      updatedAtMs: BASE_NOW - 1 * DAY,
      source: 'starter',
    },
    chapters: [
      {
        id: 'ch_1',
        storyId: 'starter_glass_harbour',
        authorId: 'starter_author_1',
        status: 'published',
        chapterNumber: 1,
        title: 'Part 1: The Salt Ledger',
        content:
          'Inside the coral-stone warehouse near Utrecht Bastion, Meera opened her grandfather’s salt-stained shipping ledger. Between two manifests from 1954 lay an unmarked charcoal map of the reef passages.\n\nShe traced the ink lines carefully; every anchored lantern noted in the margin pointed toward the lighthouse shoal.',
        createdAtMs: BASE_NOW - 1 * DAY,
        updatedAtMs: BASE_NOW - 1 * DAY,
      },
      {
        id: 'ch_2',
        storyId: 'starter_glass_harbour',
        authorId: 'starter_author_1',
        status: 'published',
        chapterNumber: 2,
        title: 'Part 2: Low Tide Signal',
        content:
          'At low water the fishermen knew which stones stayed dry. Meera walked the bastion with her cousin as the lighthouse beam swept across the dark swell, revealing the old stone steps carved right into the cliff.',
        createdAtMs: BASE_NOW - 22 * HOUR,
        updatedAtMs: BASE_NOW - 22 * HOUR,
      },
    ],
    comments: [],
  },
  {
    story: {
      id: 'starter_orbital_signal',
      title: 'Signal From Relay Nine - Part 3',
      excerpt: 'Read all chapters of the deep-space telemetry mystery orbiting Europa.',
      category: 'Sci-Fi',
      authorId: 'starter_author_1',
      authorName: 'Katha Desk',
      authorPhotoURL: '',
      authorVerified: true,
      views: 10000,
      chapterCount: 2,
      status: 'published',
      createdAtMs: BASE_NOW - 1 * DAY - 3 * HOUR,
      updatedAtMs: BASE_NOW - 1 * DAY - 3 * HOUR,
      source: 'starter',
    },
    chapters: [
      {
        id: 'ch_1',
        storyId: 'starter_orbital_signal',
        authorId: 'starter_author_1',
        status: 'published',
        chapterNumber: 1,
        title: 'Part 1: Cold Carrier Wave',
        content:
          'Relay Nine had been decommissioned six years before Commander Sato took the night watch. Yet at 03:00 UTC the dish array locked onto a clean narrowband pulse originating directly from its drifting hull.\n\nInstead of telemetry diagnostics, the signal carried a repeating acoustic recording of ocean waves.',
        createdAtMs: BASE_NOW - 1 * DAY - 3 * HOUR,
        updatedAtMs: BASE_NOW - 1 * DAY - 3 * HOUR,
      },
      {
        id: 'ch_2',
        storyId: 'starter_orbital_signal',
        authorId: 'starter_author_1',
        status: 'published',
        chapterNumber: 2,
        title: 'Part 2: Docking Bay Echo',
        content:
          'The boarding tether locked with a muted thud. Inside the frost-rimmed console bay, the backup drive was still warm—someone had left a hand-written calibration card taped beside the emergency beacon.',
        createdAtMs: BASE_NOW - 1 * DAY - 2 * HOUR,
        updatedAtMs: BASE_NOW - 1 * DAY - 2 * HOUR,
      },
    ],
    comments: [],
  },
  {
    story: {
      id: 'starter_river_ferry',
      title: 'Across the Kelani Ferry - Part 12',
      excerpt: 'Continuing stories from commuters crossing the morning mist before sunrise.',
      category: 'Slice of Life',
      authorId: 'starter_author_1',
      authorName: 'Katha Desk',
      authorPhotoURL: '',
      authorVerified: true,
      views: 11200,
      chapterCount: 2,
      status: 'published',
      createdAtMs: BASE_NOW - 2 * DAY,
      updatedAtMs: BASE_NOW - 2 * DAY,
      source: 'starter',
    },
    chapters: [
      {
        id: 'ch_1',
        storyId: 'starter_river_ferry',
        authorId: 'starter_author_1',
        status: 'published',
        chapterNumber: 1,
        title: 'Part 1: First Crossing',
        content:
          'The wooden ferry pushed away from the muddy bank at 5:30 sharp. Schoolchildren leaned over the rail watching water hyacinths drift downstream while the boatman coiled the hemp rope with effortless rhythm.',
        createdAtMs: BASE_NOW - 2 * DAY,
        updatedAtMs: BASE_NOW - 2 * DAY,
      },
      {
        id: 'ch_2',
        storyId: 'starter_river_ferry',
        authorId: 'starter_author_1',
        status: 'published',
        chapterNumber: 2,
        title: 'Part 2: The Lost Umbrella',
        content:
          'On the return crossing, a blue checkered umbrella sat tucked under the bow bench. Everyone on board recognized whose it was before the boat even touched the opposite pier.',
        createdAtMs: BASE_NOW - 2 * DAY + HOUR,
        updatedAtMs: BASE_NOW - 2 * DAY + HOUR,
      },
    ],
    comments: [],
  },
  {
    story: {
      id: 'starter_banyan_folklore',
      title: 'නෙතුගෙ කතාව — The Banyan Trail',
      excerpt: 'A quiet village tale remembered from years ago beside the old river crossing and lantern path.',
      category: 'Folklore',
      authorId: 'starter_author_1',
      authorName: 'Katha Desk',
      authorPhotoURL: '',
      authorVerified: true,
      views: 51600,
      chapterCount: 1,
      status: 'published',
      createdAtMs: BASE_NOW - 2 * YEAR,
      updatedAtMs: BASE_NOW - 2 * YEAR,
      source: 'starter',
    },
    chapters: [
      {
        id: 'ch_1',
        storyId: 'starter_banyan_folklore',
        authorId: 'starter_author_1',
        status: 'published',
        chapterNumber: 1,
        title: 'Chapter 1: Under the Old Banyan',
        content:
          'Years ago, at the edge of the paddy fields where the gravel track met the ancient banyan tree, travelers paused to rest beneath its cool canopy. Elders said the wind through its roots carried echoes of every harvest song ever sung in the valley.\n\nNethu brought a small clay lamp there each full moon, listening to the night herons call across the tank.',
        createdAtMs: BASE_NOW - 2 * YEAR,
        updatedAtMs: BASE_NOW - 2 * YEAR,
      },
    ],
    comments: [],
  },
  {
    story: {
      id: 'starter_autumn_verses',
      title: 'Evening Verses - සැන්දෑ කවි',
      excerpt: 'This poetic anthology captures quiet twilight reflections, sea breezes, and handwritten lines.',
      category: 'Poetry',
      authorId: 'starter_author_1',
      authorName: 'Katha Desk',
      authorPhotoURL: '',
      authorVerified: true,
      views: 24700,
      chapterCount: 2,
      status: 'published',
      createdAtMs: BASE_NOW - 1 * YEAR,
      updatedAtMs: BASE_NOW - 1 * YEAR,
      source: 'starter',
    },
    chapters: [
      {
        id: 'ch_1',
        storyId: 'starter_autumn_verses',
        authorId: 'starter_author_1',
        status: 'published',
        chapterNumber: 1,
        title: 'Verse I: Harbour Dusk',
        content:
          'Salt wind settles on the quiet pier,\nAmber lamps awaken one by one,\nFootsteps fade along the limestone wall,\nKeeping promises made beneath the sun.',
        createdAtMs: BASE_NOW - 1 * YEAR,
        updatedAtMs: BASE_NOW - 1 * YEAR,
      },
      {
        id: 'ch_2',
        storyId: 'starter_autumn_verses',
        authorId: 'starter_author_1',
        status: 'published',
        chapterNumber: 2,
        title: 'Verse II: Rain on Tin Roofs',
        content:
          'Silver notes upon the corrugated eaves,\nCardamom drifting from the kitchen door,\nEvery page turns slower in the rain,\nLeaving hurried hours on the shore.',
        createdAtMs: BASE_NOW - 1 * YEAR + DAY,
        updatedAtMs: BASE_NOW - 1 * YEAR + DAY,
      },
    ],
    comments: [],
  },
  {
    story: {
      id: 'starter_cloud_peak',
      title: 'Trail to Horton Ridge',
      excerpt: 'Evening fog rolled in quickly across the plains as the hikers spotted the old stone cairn.',
      category: 'Adventure',
      authorId: 'starter_author_1',
      authorName: 'Katha Desk',
      authorPhotoURL: '',
      authorVerified: true,
      views: 94200,
      chapterCount: 1,
      status: 'published',
      createdAtMs: BASE_NOW - 3 * YEAR,
      updatedAtMs: BASE_NOW - 3 * YEAR,
      source: 'starter',
    },
    chapters: [
      {
        id: 'ch_1',
        storyId: 'starter_cloud_peak',
        authorId: 'starter_author_1',
        status: 'published',
        chapterNumber: 1,
        title: 'Chapter 1: Above the Cloud Line',
        content:
          'By four o’clock the plateau had cooled sharply and wisps of cloud drifted right through the stunted rhododendrons. Nimmi checked the compass bearing twice before spotting the moss-covered stone cairn marking the ridge fork.\n\nTen minutes later the mist parted cleanly, revealing the entire southern valley sparkling thousands of feet below.',
        createdAtMs: BASE_NOW - 3 * YEAR,
        updatedAtMs: BASE_NOW - 3 * YEAR,
      },
    ],
    comments: [],
  },
  {
    story: {
      id: 'starter_bookshop_rain',
      title: 'The Secondhand Bookshop - Part 5',
      excerpt: 'Two strangers keep finding marginal notes inside the same worn paperback novels.',
      category: 'Romance',
      authorId: 'starter_author_1',
      authorName: 'Katha Desk',
      authorPhotoURL: '',
      authorVerified: true,
      views: 65400,
      chapterCount: 1,
      status: 'published',
      createdAtMs: BASE_NOW - 1 * YEAR - 2 * MONTH,
      updatedAtMs: BASE_NOW - 1 * YEAR - 2 * MONTH,
      source: 'starter',
    },
    chapters: [
      {
        id: 'ch_1',
        storyId: 'starter_bookshop_rain',
        authorId: 'starter_author_1',
        status: 'published',
        chapterNumber: 1,
        title: 'Part 1: Pencil in the Margin',
        content:
          'Inside the narrow aisle of Maradana’s oldest secondhand bookshop, Kasun picked up a faded edition of coastal short stories. Beside chapter four, neat pencil handwriting had circled a single line and written: “Read this by the sea wall at five.”',
        createdAtMs: BASE_NOW - 1 * YEAR - 2 * MONTH,
        updatedAtMs: BASE_NOW - 1 * YEAR - 2 * MONTH,
      },
    ],
    comments: [],
  },
  {
    story: {
      id: 'starter_glass_archive',
      title: 'Archive of Stolen Maps - Part 5',
      excerpt: 'A young archivist uncovers a forgotten cartographer’s guild hidden beneath the museum.',
      category: 'Mystery',
      authorId: 'starter_author_1',
      authorName: 'Katha Desk',
      authorPhotoURL: '',
      authorVerified: true,
      views: 59000,
      chapterCount: 1,
      status: 'published',
      createdAtMs: BASE_NOW - 7 * MONTH,
      updatedAtMs: BASE_NOW - 7 * MONTH,
      source: 'starter',
    },
    chapters: [
      {
        id: 'ch_1',
        storyId: 'starter_glass_archive',
        authorId: 'starter_author_1',
        status: 'published',
        chapterNumber: 1,
        title: 'Part 1: Drawer Forty-Two',
        content:
          'Drawer forty-two in the basement map room had no index card. When Tharindu eased the brass handle open, he found three hand-tinted nautical charts of islands that appeared on no modern survey.',
        createdAtMs: BASE_NOW - 7 * MONTH,
        updatedAtMs: BASE_NOW - 7 * MONTH,
      },
    ],
    comments: [],
  },
  {
    story: {
      id: 'starter_cedar_house',
      title: 'Letters From Cedar House',
      excerpt: 'Three generations of a family reconnect while restoring an ancestral hilltop home.',
      category: 'Drama',
      authorId: 'starter_author_1',
      authorName: 'Katha Desk',
      authorPhotoURL: '',
      authorVerified: true,
      views: 56700,
      chapterCount: 1,
      status: 'published',
      createdAtMs: BASE_NOW - 3 * YEAR - 1 * MONTH,
      updatedAtMs: BASE_NOW - 3 * YEAR - 1 * MONTH,
      source: 'starter',
    },
    chapters: [
      {
        id: 'ch_1',
        storyId: 'starter_cedar_house',
        authorId: 'starter_author_1',
        status: 'published',
        chapterNumber: 1,
        title: 'Chapter 1: Unpacking the Attic',
        content:
          'Dust motes floated through the tall slatted windows as the cousins lifted the lid of the teak trunk. Bundled in cotton twine were forty years of aerogrammes postmarked from London, Penang, and Jaffna.',
        createdAtMs: BASE_NOW - 3 * YEAR - 1 * MONTH,
        updatedAtMs: BASE_NOW - 3 * YEAR - 1 * MONTH,
      },
    ],
    comments: [],
  },
  {
    story: {
      id: 'starter_starlight_express',
      title: 'Night Mail to Badulla',
      excerpt: 'A slow journey through forty tunnels where every passenger carries a story worth telling.',
      category: 'Adventure',
      authorId: 'starter_author_1',
      authorName: 'Katha Desk',
      authorPhotoURL: '',
      authorVerified: true,
      views: 40100,
      chapterCount: 1,
      status: 'published',
      createdAtMs: BASE_NOW - 2 * YEAR - 3 * MONTH,
      updatedAtMs: BASE_NOW - 2 * YEAR - 3 * MONTH,
      source: 'starter',
    },
    chapters: [
      {
        id: 'ch_1',
        storyId: 'starter_starlight_express',
        authorId: 'starter_author_1',
        status: 'published',
        chapterNumber: 1,
        title: 'Chapter 1: Nine Arches at Dawn',
        content:
          'The sleeper carriage swayed gently as the diesel locomotive climbed past Pattipola. By the time the first cool light spilled across the tea terraces, the conductor opened the observation door and the scent of wet eucalyptus filled the aisle.',
        createdAtMs: BASE_NOW - 2 * YEAR - 3 * MONTH,
        updatedAtMs: BASE_NOW - 2 * YEAR - 3 * MONTH,
      },
    ],
    comments: [],
  },
];

export const STARTER_STORIES: Story[] = STARTER_STORY_BUNDLES.map((b) => b.story);

export function getStarterChapters(storyId: string): StoryChapter[] {
  return STARTER_STORY_BUNDLES.find((b) => b.story.id === storyId)?.chapters ?? [];
}

export function getStarterComments(storyId: string): StoryComment[] {
  return STARTER_STORY_BUNDLES.find((b) => b.story.id === storyId)?.comments ?? [];
}
