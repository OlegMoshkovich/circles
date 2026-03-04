export type Translations = typeof en;

export const en = {
  locale: "en-US",
  nav: {
    villageLiving: "Village Living",
    events: "Events",
    profile: "Profile",
  },
  home: {
    subtitle: "Curated essentials and seasonal rhythms \nliving with the lake and forest as part of daily life.",
    today: "TODAY",
    todayItems: [
      { icon: "thermometer-outline", label: "4°C, clear skies" },
      { icon: "navigate-outline", label: "Light breeze from the east" },
      { icon: "time-outline", label: "Sunrise 7:42 AM · Sunset 4:52 PM" },
    ],
    todayNote: "Perfect morning for a lake walk before the market opens.",
    seasonalPrompts: "SEASONAL PROMPTS",
    suggestions: [
      {
        title: "Winter Morning Lake Walk",
        badge: "ROUTE",
        description: "A quiet path along the frozen shore. Best in early light when mist rises from the water.",
        quote: "Perfect for morning walks. Watch the sunrise from the dock.",
      },
      {
        title: "First Light at the Forest Edge",
        badge: "MOMENT",
        description: "The clearing near the oak grove catches the morning sun perfectly in winter.",
        quote: "The light here in winter is unlike anything else. Arrive before 7:30.",
      },
      {
        title: "Hidden Tea House",
        badge: "DISCOVERY",
        description: "A cozy stop on the way back. Open from 9 AM on weekends.",
        quote: "The best kept secret in the neighbourhood. The cardamom tea is wonderful.",
      },
    ],
  },
  events: {
    subtitle: "Gentle opportunities for connection \nsmall, meaningful gatherings",
    badgeGoing: "GOING",
    badgeMaybe: "MAYBE",
    by: "by",
    goingLabel: "going",
    maybeLabel: "maybe",
    items: [
      {
        title: "Morning Lake Swim",
        description: "A refreshing early morning swim at the lake. All levels welcome—bring a towel and good energy.",
      },
      {
        title: "Afternoon Coffee",
        description: "An informal drop-in coffee hour in the common room. Come for a chat or bring something to work on.",
      },
      {
        title: "Weekend Garden Work",
        description: "Let's prepare the garden beds for spring. All skill levels welcome.",
      },
    ],
  },
  profile: {
    account: "ACCOUNT",
    circle: "Circle",
    circleValue: "Circles Collective",
    memberSince: "Member since",
    neighbourhood: "NEIGHBOURHOOD",
    location: "Location",
    locationValue: "Lakeside Quarter",
    neighbours: "Neighbours",
    neighboursValue: "24 members",
    language: "LANGUAGE",
  },
};

export const de: Translations = {
  locale: "de-CH",
  nav: {
    villageLiving: "Dorfleben",
    events: "Veranstaltungen",
    profile: "Profil",
  },
  home: {
    subtitle: "Kuratierte Essenzialles und saisonale Rhythmen –\ndas Leben mit dem See und Wald als Teil des Alltags.",
    today: "HEUTE",
    todayItems: [
      { icon: "thermometer-outline", label: "4°C, klarer Himmel" },
      { icon: "navigate-outline", label: "Leichte Brise aus dem Osten" },
      { icon: "time-outline", label: "Sonnenaufgang 07:42 · Sonnenuntergang 16:52" },
    ],
    todayNote: "Schöner Morgen für einen Seespaziergang vor dem Markt.",
    seasonalPrompts: "SAISONALE ANREGUNGEN",
    suggestions: [
      {
        title: "Wintermorgen-Seespaziergang",
        badge: "ROUTE",
        description: "Ein stiller Pfad am gefrorenen Ufer. Am schönsten im frühen Licht, wenn Nebel über dem Wasser aufsteigt.",
        quote: "Perfekt für Morgenausflüge. Den Sonnenaufgang vom Steg aus beobachten.",
      },
      {
        title: "Erstes Licht am Waldrand",
        badge: "MOMENT",
        description: "Die Lichtung beim Eichenwald fängt die Morgensonne im Winter wunderbar ein.",
        quote: "Das Licht hier im Winter ist einzigartig. Vor 7:30 Uhr ankommen.",
      },
      {
        title: "Verstecktes Teehaus",
        badge: "ENTDECKUNG",
        description: "Ein gemütlicher Zwischenstopp auf dem Rückweg. An Wochenenden ab 9 Uhr geöffnet.",
        quote: "Das bestgehütete Geheimnis der Nachbarschaft. Der Kardamom-Tee ist wunderbar.",
      },
    ],
  },
  events: {
    subtitle: "Sanfte Gelegenheiten zur Begegnung –\nkleine, bedeutungsvolle Zusammenkünfte",
    badgeGoing: "DABEI",
    badgeMaybe: "VIELLEICHT",
    by: "von",
    goingLabel: "dabei",
    maybeLabel: "vielleicht",
    items: [
      {
        title: "Morgendliches Seeschwimmen",
        description: "Ein erfrischendes Frühmorgen-Schwimmen am See. Alle Niveaus willkommen – Handtuch und gute Energie mitbringen.",
      },
      {
        title: "Nachmittagskaffee",
        description: "Eine informelle Kaffeestunde im Gemeinschaftsraum. Komm zum Plausch oder bring etwas zum Arbeiten mit.",
      },
      {
        title: "Wochenend-Gartenarbeit",
        description: "Wir bereiten die Beete für den Frühling vor. Alle Erfahrungsstufen willkommen.",
      },
    ],
  },
  profile: {
    account: "KONTO",
    circle: "Kreis",
    circleValue: "Kreise-Kollektiv",
    memberSince: "Mitglied seit",
    neighbourhood: "NACHBARSCHAFT",
    location: "Standort",
    locationValue: "Seequartier",
    neighbours: "Nachbarn",
    neighboursValue: "24 Mitglieder",
    language: "SPRACHE",
  },
};

export const translations = { en, de };
