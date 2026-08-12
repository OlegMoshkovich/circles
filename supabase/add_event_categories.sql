-- Add a topic/category column to events and tag every imported event.
-- Safe to re-run. Generated for circles: San Bernardino, Engadin, Andermatt, Zurich.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS category text;

-- San Bernardino Swissalps  (d44857b1)
UPDATE public.events SET category = 'Family & Kids' WHERE circle_id = 'd44857b1-3d34-4267-a534-989c71db466d' AND title = 'SanBe Kids Multisport';
UPDATE public.events SET category = 'Family & Kids' WHERE circle_id = 'd44857b1-3d34-4267-a534-989c71db466d' AND title = 'Walks with alpacas and llamas';
UPDATE public.events SET category = 'Outdoor & Sport' WHERE circle_id = 'd44857b1-3d34-4267-a534-989c71db466d' AND title = 'Guided tour of the Lago d''Isola Dam';
UPDATE public.events SET category = 'Food' WHERE circle_id = 'd44857b1-3d34-4267-a534-989c71db466d' AND title = 'Alpine Gourmet – Luca Bellanca';
UPDATE public.events SET category = 'Food' WHERE circle_id = 'd44857b1-3d34-4267-a534-989c71db466d' AND title = 'Night of the Stars';
UPDATE public.events SET category = 'Music' WHERE circle_id = 'd44857b1-3d34-4267-a534-989c71db466d' AND title = 'Sunset Concert';
UPDATE public.events SET category = 'Creativity' WHERE circle_id = 'd44857b1-3d34-4267-a534-989c71db466d' AND title = 'Creative Workshops – Kokedama';
UPDATE public.events SET category = 'Culture' WHERE circle_id = 'd44857b1-3d34-4267-a534-989c71db466d' AND title = 'Alpine Ferragosto';
UPDATE public.events SET category = 'Wellness' WHERE circle_id = 'd44857b1-3d34-4267-a534-989c71db466d' AND title = 'Innerwalk Wellness Tour: High-Altitude Sound Healing';
UPDATE public.events SET category = 'Music' WHERE circle_id = 'd44857b1-3d34-4267-a534-989c71db466d' AND title = 'Silvan Zingg Trio';
UPDATE public.events SET category = 'Wellness' WHERE circle_id = 'd44857b1-3d34-4267-a534-989c71db466d' AND title = 'Outdoor Yoga';
UPDATE public.events SET category = 'Food' WHERE circle_id = 'd44857b1-3d34-4267-a534-989c71db466d' AND title = 'Paella at Piazzetta Brocco';
UPDATE public.events SET category = 'Culture' WHERE circle_id = 'd44857b1-3d34-4267-a534-989c71db466d' AND title = 'Unveiling of the First Aid Vehicle';
UPDATE public.events SET category = 'Food' WHERE circle_id = 'd44857b1-3d34-4267-a534-989c71db466d' AND title = 'Aperitif in the Square';
UPDATE public.events SET category = 'Outdoor & Sport' WHERE circle_id = 'd44857b1-3d34-4267-a534-989c71db466d' AND title = 'Hike: San Bernardino to Pradiron';
UPDATE public.events SET category = 'Music' WHERE circle_id = 'd44857b1-3d34-4267-a534-989c71db466d' AND title = 'Concert by the Lugano Mandolin Orchestra';
UPDATE public.events SET category = 'Outdoor & Sport' WHERE circle_id = 'd44857b1-3d34-4267-a534-989c71db466d' AND title = 'Backyard Ultra San Bernardino';
UPDATE public.events SET category = 'Music' WHERE circle_id = 'd44857b1-3d34-4267-a534-989c71db466d' AND title = 'Summer Village Closing Party';
UPDATE public.events SET category = 'Wellness' WHERE circle_id = 'd44857b1-3d34-4267-a534-989c71db466d' AND title = 'Yolatis Pilates';
UPDATE public.events SET category = 'Culture' WHERE circle_id = 'd44857b1-3d34-4267-a534-989c71db466d' AND title = '500th Anniversary of the Fall of Mesocco Castle';
UPDATE public.events SET category = 'Food' WHERE circle_id = 'd44857b1-3d34-4267-a534-989c71db466d' AND title = 'Edelweiss – Stelle Alpine';

-- Engadin  (bcdd91ed)
UPDATE public.events SET category = 'Creativity' WHERE circle_id = 'bcdd91ed-5f23-4231-87a0-2e2ad6cc3a30' AND title = 'Hannibal – Open-Air Play';
UPDATE public.events SET category = 'Music' WHERE circle_id = 'bcdd91ed-5f23-4231-87a0-2e2ad6cc3a30' AND title = 'Village Square Concert "Openroads"';
UPDATE public.events SET category = 'Food' WHERE circle_id = 'bcdd91ed-5f23-4231-87a0-2e2ad6cc3a30' AND title = 'Alpetta Wine Festival';
UPDATE public.events SET category = 'Music' WHERE circle_id = 'bcdd91ed-5f23-4231-87a0-2e2ad6cc3a30' AND title = 'Summer Night Festival Champfèr';
UPDATE public.events SET category = 'Outdoor & Sport' WHERE circle_id = 'bcdd91ed-5f23-4231-87a0-2e2ad6cc3a30' AND title = 'Vanora Engadinwind';
UPDATE public.events SET category = 'Outdoor & Sport' WHERE circle_id = 'bcdd91ed-5f23-4231-87a0-2e2ad6cc3a30' AND title = 'SPAR Swiss Epic – MTB Stage Race';
UPDATE public.events SET category = 'Wellness' WHERE circle_id = 'bcdd91ed-5f23-4231-87a0-2e2ad6cc3a30' AND title = 'SUP Yoga';
UPDATE public.events SET category = 'Food' WHERE circle_id = 'bcdd91ed-5f23-4231-87a0-2e2ad6cc3a30' AND title = 'Dorffest St. Moritz';
UPDATE public.events SET category = 'Culture' WHERE circle_id = 'bcdd91ed-5f23-4231-87a0-2e2ad6cc3a30' AND title = 'Open House – Silvaplana Power Plant';
UPDATE public.events SET category = 'Food' WHERE circle_id = 'bcdd91ed-5f23-4231-87a0-2e2ad6cc3a30' AND title = 'St. Moritz Gourmet Festival – Hike & Fine Dining';
UPDATE public.events SET category = 'Food' WHERE circle_id = 'bcdd91ed-5f23-4231-87a0-2e2ad6cc3a30' AND title = 'St. Moritz Gourmet Festival – Gourmet Dinner';
UPDATE public.events SET category = 'Culture' WHERE circle_id = 'bcdd91ed-5f23-4231-87a0-2e2ad6cc3a30' AND title = 'Passione Engadina';
UPDATE public.events SET category = 'Outdoor & Sport' WHERE circle_id = 'bcdd91ed-5f23-4231-87a0-2e2ad6cc3a30' AND title = 'Nationalpark Bike-Marathon (25th edition)';
UPDATE public.events SET category = 'Outdoor & Sport' WHERE circle_id = 'bcdd91ed-5f23-4231-87a0-2e2ad6cc3a30' AND title = 'Swiss Windsurfing Championships';

-- Andermatt  (3e8b5884)
UPDATE public.events SET category = 'Film' WHERE circle_id = '3e8b5884-e6ef-40de-bd17-8a3aea6ee7be' AND title = 'Open Air Cinema at Gütsch';
UPDATE public.events SET category = 'Outdoor & Sport' WHERE circle_id = '3e8b5884-e6ef-40de-bd17-8a3aea6ee7be' AND title = 'Nordic Weekend';
UPDATE public.events SET category = 'Wellness' WHERE circle_id = '3e8b5884-e6ef-40de-bd17-8a3aea6ee7be' AND title = 'Yoga & Brunch at The Swiss House';
UPDATE public.events SET category = 'Wellness' WHERE circle_id = '3e8b5884-e6ef-40de-bd17-8a3aea6ee7be' AND title = 'Sanctum x THE UNIT';
UPDATE public.events SET category = 'Outdoor & Sport' WHERE circle_id = '3e8b5884-e6ef-40de-bd17-8a3aea6ee7be' AND title = 'BMC Cycology Ride Out';
UPDATE public.events SET category = 'Outdoor & Sport' WHERE circle_id = '3e8b5884-e6ef-40de-bd17-8a3aea6ee7be' AND title = 'Tremola by Night';

-- Zurich  (90303ae1)
UPDATE public.events SET category = 'Creativity' WHERE circle_id = '90303ae1-0c49-4132-a057-66cdc06364bf' AND title = 'Zürcher Theater Spektakel';
UPDATE public.events SET category = 'Music' WHERE circle_id = '90303ae1-0c49-4132-a057-66cdc06364bf' AND title = 'H2U Openair Uster';
UPDATE public.events SET category = 'Culture' WHERE circle_id = '90303ae1-0c49-4132-a057-66cdc06364bf' AND title = 'Dorffest Brütten';
UPDATE public.events SET category = 'Music' WHERE circle_id = '90303ae1-0c49-4132-a057-66cdc06364bf' AND title = 'Winterthurer Musikfestwochen';
UPDATE public.events SET category = 'Music' WHERE circle_id = '90303ae1-0c49-4132-a057-66cdc06364bf' AND title = 'RundfunkFM Festival';
UPDATE public.events SET category = 'Outdoor & Sport' WHERE circle_id = '90303ae1-0c49-4132-a057-66cdc06364bf' AND title = '60. Zürcher Limmatschwimmen';
UPDATE public.events SET category = 'Outdoor & Sport' WHERE circle_id = '90303ae1-0c49-4132-a057-66cdc06364bf' AND title = 'Weltklasse Zürich – City Event (Main Station)';
UPDATE public.events SET category = 'Outdoor & Sport' WHERE circle_id = '90303ae1-0c49-4132-a057-66cdc06364bf' AND title = 'Weltklasse Zürich – Letzigrund (Diamond League)';
UPDATE public.events SET category = 'Film' WHERE circle_id = '90303ae1-0c49-4132-a057-66cdc06364bf' AND title = 'Allianz Open Air Cinema';
UPDATE public.events SET category = 'Film' WHERE circle_id = '90303ae1-0c49-4132-a057-66cdc06364bf' AND title = 'Dolder Wellenkino';
UPDATE public.events SET category = 'Food' WHERE circle_id = '90303ae1-0c49-4132-a057-66cdc06364bf' AND title = 'The Palm 3 at LUX';
UPDATE public.events SET category = 'Food' WHERE circle_id = '90303ae1-0c49-4132-a057-66cdc06364bf' AND title = 'Sea Grill pop-up';
UPDATE public.events SET category = 'Food' WHERE circle_id = '90303ae1-0c49-4132-a057-66cdc06364bf' AND title = 'Soi Thai pop-up';
UPDATE public.events SET category = 'Food' WHERE circle_id = '90303ae1-0c49-4132-a057-66cdc06364bf' AND title = 'Micas Garten street-food garden';
UPDATE public.events SET category = 'Music' WHERE circle_id = '90303ae1-0c49-4132-a057-66cdc06364bf' AND title = 'Tanz am Sunntig';
UPDATE public.events SET category = 'Food' WHERE circle_id = '90303ae1-0c49-4132-a057-66cdc06364bf' AND title = 'La Tavolata des Vins du Valais';
UPDATE public.events SET category = 'Culture' WHERE circle_id = '90303ae1-0c49-4132-a057-66cdc06364bf' AND title = 'Marisol – Kunsthaus Zürich';
UPDATE public.events SET category = 'Culture' WHERE circle_id = '90303ae1-0c49-4132-a057-66cdc06364bf' AND title = 'William Paul Young – Hiltl Academy';
UPDATE public.events SET category = 'Culture' WHERE circle_id = '90303ae1-0c49-4132-a057-66cdc06364bf' AND title = 'Wir und der Krieg – Landesmuseum';
UPDATE public.events SET category = 'Culture' WHERE circle_id = '90303ae1-0c49-4132-a057-66cdc06364bf' AND title = 'Bauen für die Macht – Pavillon Le Corbusier';
UPDATE public.events SET category = 'Culture' WHERE circle_id = '90303ae1-0c49-4132-a057-66cdc06364bf' AND title = 'An der Eiskante – NONAM';

