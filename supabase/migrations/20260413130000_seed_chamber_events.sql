-- Seed chamber events from the TSM Chamber Tracker reference
-- Maps chamber names to IDs via subquery

INSERT INTO chamber_events (chamber_id, name, event_type, event_date, event_time, location, is_manual)
SELECT c.id, e.name, e.event_type, e.event_date::DATE, e.event_time, e.location, false
FROM (VALUES
  -- West Valley Chamber
  ('West Valley Chamber', 'Midday Mingle', 'Networking', '2026-03-17', '12:00 pm', 'Brookside Sports Bar & Grille, Surprise'),
  ('West Valley Chamber', 'Connect at Noon', 'Networking', '2026-03-18', '12:00 pm', 'Haymaker Goodyear'),
  ('West Valley Chamber', 'Harvest Compassion + Hope Women''s Center Grand Opening', 'Ribbon Cutting', '2026-03-18', '8:30 am', '8363 W. Van Buren, Tolleson'),
  ('West Valley Chamber', 'Jelly Pop Up', 'Community', '2026-03-19', '9:00 am', 'Chamber Office, Goodyear'),
  ('West Valley Chamber', 'Grand Opening — Senior Helpers of Sun City West', 'Ribbon Cutting', '2026-03-23', '10:30 am', '13576 W Camino Del Sol, Sun City West'),
  ('West Valley Chamber', 'Cybersecurity & AI Lunch & Learn', 'Education', '2026-03-26', '11:30 am', 'Chamber Office, 289 N. Litchfield Rd'),
  ('West Valley Chamber', 'March EPIC Networking', 'Networking', '2026-03-26', '5:00 pm', 'Dillon''s Western Trails Ranch, Surprise'),
  ('West Valley Chamber', 'Connect at Noon', 'Networking', '2026-04-01', '12:00 pm', 'Haymaker Goodyear'),
  ('West Valley Chamber', 'First Friday at Goodyear Ballpark', 'Networking', '2026-04-03', '5:00 pm', 'Goodyear Ballpark'),
  ('West Valley Chamber', 'Midday Mingle', 'Networking', '2026-04-07', '12:00 pm', 'Brookside Sports Bar & Grille, Surprise'),
  ('West Valley Chamber', 'Healthcare Networking Event', 'Networking', '2026-04-09', '11:00 am', 'AZMediQuip, Goodyear'),
  ('West Valley Chamber', 'The Taste', 'Signature', '2026-04-17', '6:00 pm', 'Estrella Mountain CC, Avondale'),
  ('West Valley Chamber', 'Midday Mingle', 'Networking', '2026-04-21', '12:00 pm', 'Brookside Sports Bar & Grille, Surprise'),
  ('West Valley Chamber', 'Vascular & Interventional Partners Grand Opening', 'Ribbon Cutting', '2026-04-21', '12:00 pm', '10825 W. McDowell Rd, Avondale'),
  ('West Valley Chamber', 'Annual Meeting', 'Meeting', '2026-05-12', '8:00 am', 'Phoenix Raceway, Avondale'),

  -- NW Valley Chamber
  ('NW Valley Chamber', 'ICE Breaker — Introductory Chamber Event', 'Networking', '2026-03-19', 'TBD', 'NW Valley Chamber, Surprise'),
  ('NW Valley Chamber', 'Multi-Chamber Breakfast', 'Networking', '2026-03-26', 'TBD', 'NW Valley Chamber, Surprise'),
  ('NW Valley Chamber', 'WE CARE Community Event & Vendor Show', 'Community', '2026-03-28', 'TBD', 'Sun City West Area'),
  ('NW Valley Chamber', 'UCC Government Affairs Committee', 'Government', '2026-04-20', 'TBD', 'NW Valley Chamber'),
  ('NW Valley Chamber', '5th Annual Blockfest', 'Community', '2026-05-16', 'TBD', 'Sun City West Area'),

  -- Phoenix Chamber
  ('Phoenix Chamber', 'GPC Spring Mixer', 'Networking', '2026-03-25', 'TBD', 'TBD, Phoenix'),
  ('Phoenix Chamber', 'Valley Young Professionals Mixer', 'Networking', '2026-03-26', 'TBD', 'TBD, Phoenix'),
  ('Phoenix Chamber', 'Mayor''s State of the City Luncheon', 'Signature', '2026-04-01', 'TBD', 'TBD, Phoenix'),

  -- Glendale Chamber
  ('Glendale Chamber', 'Business Over Breakfast', 'Networking', '2026-03-18', '7:00 am', 'Red Zone Sports Grill, Glendale'),
  ('Glendale Chamber', 'Business Over Breakfast', 'Networking', '2026-04-01', '7:00 am', 'Red Zone Sports Grill, Glendale'),
  ('Glendale Chamber', 'Luke Golf Outing & Business on the Green', 'Signature', '2026-04-10', 'TBD', 'Palm Valley Golf Club'),
  ('Glendale Chamber', 'Business Over Breakfast', 'Networking', '2026-05-06', '7:00 am', 'Red Zone Sports Grill, Glendale'),

  -- Scottsdale Chamber
  ('Scottsdale Chamber', 'AM Connect — Scottsdale Golf Performance', 'Networking', '2026-03-19', 'Morning', 'Scottsdale Golf Performance'),
  ('Scottsdale Chamber', 'Ribbon Cutting — Wild West Interior', 'Ribbon Cutting', '2026-03-19', 'Afternoon', 'North Scottsdale'),
  ('Scottsdale Chamber', 'Ribbon Cutting — GH2 Architects', 'Ribbon Cutting', '2026-03-26', '4:00 pm', 'ASU SkySong, Scottsdale'),
  ('Scottsdale Chamber', 'Friday Forum — Lasting Health', 'Education', '2026-03-27', 'TBD', 'Scottsdale Chamber Board Room'),
  ('Scottsdale Chamber', 'SRYP Networking Pickleball', 'Networking', '2026-03-27', 'Afternoon', 'Grand Hyatt Scottsdale Resort'),
  ('Scottsdale Chamber', 'PM Connect — Aloft Scottsdale Hotel', 'Networking', '2026-04-01', 'Evening', 'Aloft Scottsdale Hotel'),
  ('Scottsdale Chamber', 'Ribbon Cutting — DryBar Scottsdale Quarter', 'Ribbon Cutting', '2026-04-08', 'Afternoon', 'Scottsdale Quarter'),
  ('Scottsdale Chamber', 'SRYP — Scottsdale Police Day', 'Networking', '2026-04-09', 'Evening', 'Scottsdale'),
  ('Scottsdale Chamber', 'Ribbon Cutting — Woofie''s of Scottsdale', 'Ribbon Cutting', '2026-04-09', 'Afternoon', 'Pinnacle Brewing Co., Scottsdale'),
  ('Scottsdale Chamber', 'Ribbon Cutting — Stephanie Larsen Interiors', 'Ribbon Cutting', '2026-04-13', '4:00 pm', 'Old Town Scottsdale'),
  ('Scottsdale Chamber', 'Scottsdale History Hall of Fame', 'Signature', '2026-05-15', 'TBD', 'Embassy Suites Scottsdale Resort'),

  -- Tempe Chamber
  ('Tempe Chamber', 'Networking @ Noon', 'Networking', '2026-03-17', '12:00 pm', 'Tempe Chamber'),
  ('Tempe Chamber', 'Tempe Talks: A Business Owners Forum', 'Education', '2026-03-19', '4:00 pm', 'Tempe Chamber'),
  ('Tempe Chamber', 'Business After Hours Mixer', 'Networking', '2026-03-25', '4:00 pm', 'Outlaw Kitchen, Tempe'),
  ('Tempe Chamber', 'Ribbon Cutting: Castro''s Cigar Bar', 'Ribbon Cutting', '2026-04-03', '4:00 pm', 'Tempe'),
  ('Tempe Chamber', 'Tempe Talks: Business Owners Forum', 'Education', '2026-04-09', '4:00 pm', 'Tempe Chamber'),
  ('Tempe Chamber', 'Networking @ Noon', 'Networking', '2026-04-14', '12:00 pm', 'Tempe Chamber'),
  ('Tempe Chamber', 'Golfland Sunsplash Networking BBQ', 'Networking', '2026-04-16', '4:00 pm', 'Golfland Sunsplash, Tempe'),
  ('Tempe Chamber', '2026 Leadership Conference', 'Signature', '2026-04-17', '10:00 am', 'Tempe Chamber'),
  ('Tempe Chamber', 'Business After Hours Mixer', 'Networking', '2026-04-22', '4:00 pm', 'Graduate Hotel, Tempe'),
  ('Tempe Chamber', 'Innovating the Future of Affordable Housing', 'Education', '2026-04-30', '8:30 am', 'Tempe Chamber'),
  ('Tempe Chamber', 'Business Excellence Awards Luncheon', 'Signature', '2026-06-11', '12:00 pm', 'TBD, Tempe'),

  -- Fountain Hills Chamber
  ('Fountain Hills Chamber', 'FH Connect Breakfast', 'Networking', '2026-03-19', '7:30 am', 'FHUSD Learning Center, Fountain Hills'),
  ('Fountain Hills Chamber', 'Chamber Gala Awards — Celestial Soiree', 'Signature', '2026-04-17', '5:30 pm', 'We-Ko-Pa Casino Resort, Fountain Hills'),
  ('Fountain Hills Chamber', 'Thanksgiving Day Parade', 'Community', '2026-11-19', 'TBD', 'Avenue of the Fountains, Fountain Hills'),

  -- Peoria Chamber
  ('Peoria Chamber', 'Business Networking Breakfast', 'Networking', '2026-03-17', 'Morning', 'ArchWell Health, Peoria'),
  ('Peoria Chamber', 'Charity Golf Tournament', 'Networking', '2026-04-24', 'TBD', 'Briarwood Country Club, Peoria'),

  -- Greater Cottonwood Chamber
  ('Greater Cottonwood Chamber', 'Regional Chamber Mixer', 'Networking', '2026-03-16', 'TBD', 'Cottonwood, AZ'),
  ('Greater Cottonwood Chamber', 'Ribbon Cutting — Wisdom of the Earth', 'Ribbon Cutting', '2026-03-19', 'TBD', 'Cottonwood, AZ'),
  ('Greater Cottonwood Chamber', 'Cottonwood Cooler Golf Challenge', 'Signature', '2026-08-06', '7:00 am', 'Agave Highlands Golf Course, Cottonwood'),

  -- Anthem Chamber
  ('Anthem Chamber', 'Morning Meeting', 'Networking', '2026-03-12', '7:00 am', 'Anthem Civic Building, Anthem'),
  ('Anthem Chamber', 'Morning Meeting', 'Networking', '2026-04-09', '7:00 am', 'Anthem Civic Building, Anthem'),
  ('Anthem Chamber', 'Morning Meeting', 'Networking', '2026-05-14', '7:00 am', 'Anthem Civic Building, Anthem'),
  ('Anthem Chamber', 'Morning Meeting', 'Networking', '2026-06-11', '7:00 am', 'Anthem Civic Building, Anthem'),
  ('Anthem Chamber', 'Business After Hours', 'Networking', '2026-03-26', '5:00 pm', 'Location rotates monthly, Anthem'),
  ('Anthem Chamber', 'Business After Hours', 'Networking', '2026-04-23', '5:00 pm', 'Location rotates monthly, Anthem'),
  ('Anthem Chamber', 'Business After Hours', 'Networking', '2026-05-28', '5:00 pm', 'Location rotates monthly, Anthem'),
  ('Anthem Chamber', 'Business After Hours', 'Networking', '2026-06-25', '5:00 pm', 'Location rotates monthly, Anthem'),

  -- Wickenburg Chamber
  ('Wickenburg Chamber', 'Quarterly Luncheon', 'Meeting', '2026-03-20', '12:00 pm', 'Wickenburg Country Club'),
  ('Wickenburg Chamber', 'Guys Who Grill', 'Community', '2026-03-21', 'Afternoon', 'Downtown Wickenburg'),
  ('Wickenburg Chamber', 'Business After Hours Mixer', 'Networking', '2026-03-26', '5:30 pm', 'Bushel & a Peck, 1235 W Wickenburg Way'),
  ('Wickenburg Chamber', 'Box Canyon Cleanup', 'Community', '2026-03-28', 'TBD', 'Box Canyon, Wickenburg'),
  ('Wickenburg Chamber', 'Diamonds & Denim Dinner & Dance', 'Signature', '2026-04-11', '5:00 pm', 'Wickenburg Community Hospital Foundation'),
  ('Wickenburg Chamber', 'AI for Small Business Workshop', 'Education', '2026-04-15', '12:00 pm', '1100 E. Sheldon St, Prescott'),
  ('Wickenburg Chamber', 'Ladies Night Out — Cowgirl Up! Exhibit', 'Community', '2026-04-16', 'Evening', 'Wickenburg'),

  -- Carefree-Cave Creek Chamber
  ('Carefree-Cave Creek Chamber', 'Ribbon Cutting — Discover Strength', 'Ribbon Cutting', '2026-03-03', '5:00 pm', 'Carefree/Cave Creek Area'),
  ('Carefree-Cave Creek Chamber', 'Monthly Networking Mixer — Alta Vista Apartments', 'Networking', '2026-03-11', '5:30 pm', 'Alta Vista Apartments, Cave Creek'),
  ('Carefree-Cave Creek Chamber', 'Coffee at the Chamber', 'Networking', '2026-03-18', '12:00 pm', '748 Easy Street, Carefree'),
  ('Carefree-Cave Creek Chamber', 'Monthly Business Breakfast', 'Networking', '2026-03-26', '7:30 am', '748 Easy Street, Carefree'),
  ('Carefree-Cave Creek Chamber', 'Ribbon Cutting — Burn Boot Camp', 'Ribbon Cutting', '2026-03-31', '5:00 pm', 'Carefree/Cave Creek Area'),
  ('Carefree-Cave Creek Chamber', 'Monthly Networking Mixer — Cave Creek Assisted Living', 'Networking', '2026-04-08', '5:30 pm', 'Cave Creek Assisted Living, Cave Creek'),
  ('Carefree-Cave Creek Chamber', 'Coffee at the Chamber', 'Networking', '2026-04-15', '12:00 pm', '748 Easy Street, Carefree'),
  ('Carefree-Cave Creek Chamber', 'Ribbon Cutting — Vitale Law', 'Ribbon Cutting', '2026-04-28', '5:00 pm', 'Carefree/Cave Creek Area'),
  ('Carefree-Cave Creek Chamber', 'Monthly Business Breakfast', 'Networking', '2026-04-30', '7:30 am', '748 Easy Street, Carefree'),

  -- Prescott Chamber
  ('Prescott Chamber', 'New Member Breakfast', 'Networking', '2026-03-01', 'Morning', 'Prescott Chamber, 117 W. Goodwin Street'),
  ('Prescott Chamber', 'Wednesday Warriors Networking', 'Networking', '2026-03-17', 'Morning', 'Prescott Chamber, 117 W. Goodwin Street'),
  ('Prescott Chamber', 'Networking @ Nite', 'Networking', '2026-03-26', '5:00 pm', 'Prescott Resort & Conference Center'),
  ('Prescott Chamber', 'Coffee Connect', 'Networking', '2026-04-22', 'Morning', 'Embry-Riddle Student Union Hanger'),
  ('Prescott Chamber', 'Off Street Arts & Crafts Show', 'Community', '2026-05-23', '9:00 am', 'Chamber Parking Lot, 209 S. Montezuma'),
  ('Prescott Chamber', 'Territorial Days Arts & Crafts Show', 'Signature', '2026-06-06', 'All day', 'Yavapai County Courthouse Plaza'),
  ('Prescott Chamber', 'New Member Breakfast (Fall)', 'Networking', '2026-09-01', 'Morning', 'Prescott Chamber, 117 W. Goodwin Street'),
  ('Prescott Chamber', 'Labor Day Arts & Crafts Show', 'Community', '2026-09-05', 'All day', 'Yavapai County Courthouse Plaza'),
  ('Prescott Chamber', 'Fall Arts & Crafts Show', 'Community', '2026-10-03', 'All day', 'Yavapai County Courthouse Plaza')

) AS e(chamber_name, name, event_type, event_date, event_time, location)
JOIN chambers c ON c.name = e.chamber_name
WHERE NOT EXISTS (
  SELECT 1 FROM chamber_events ce
  WHERE ce.chamber_id = c.id
    AND ce.name = e.name
    AND ce.event_date = e.event_date::DATE
);
