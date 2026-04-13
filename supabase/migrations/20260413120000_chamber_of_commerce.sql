-- Chamber of Commerce Module
-- Master list of chambers, assignments, events, and event assignments

-- ─── TABLES ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chambers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  username TEXT,
  password TEXT,
  has_portal BOOLEAN NOT NULL DEFAULT false,
  portal_url TEXT,
  portal_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chamber_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamber_id UUID NOT NULL REFERENCES chambers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(chamber_id, user_id)
);

CREATE TABLE IF NOT EXISTS chamber_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamber_id UUID NOT NULL REFERENCES chambers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TEXT,
  location TEXT,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chamber_event_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES chamber_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'confirmed', 'declined')),
  note TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_chamber_assignments_user ON chamber_assignments(user_id);
CREATE INDEX idx_chamber_assignments_chamber ON chamber_assignments(chamber_id);
CREATE INDEX idx_chamber_events_chamber ON chamber_events(chamber_id);
CREATE INDEX idx_chamber_events_date ON chamber_events(event_date);
CREATE INDEX idx_chamber_event_assignments_user ON chamber_event_assignments(user_id);
CREATE INDEX idx_chamber_event_assignments_event ON chamber_event_assignments(event_id);

-- ─── RLS ──────────────────────────────────────────────────────

ALTER TABLE chambers ENABLE ROW LEVEL SECURITY;
ALTER TABLE chamber_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chamber_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE chamber_event_assignments ENABLE ROW LEVEL SECURITY;

-- Admin: full access on all tables
CREATE POLICY "admin_all_chambers" ON chambers FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_all_chamber_assignments" ON chamber_assignments FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_all_chamber_events" ON chamber_events FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_all_chamber_event_assignments" ON chamber_event_assignments FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Manager: full access on all tables
CREATE POLICY "manager_all_chambers" ON chambers FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'));

CREATE POLICY "manager_all_chamber_assignments" ON chamber_assignments FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'));

CREATE POLICY "manager_all_chamber_events" ON chamber_events FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'));

CREATE POLICY "manager_all_chamber_event_assignments" ON chamber_event_assignments FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager'));

-- Sales reps: can only see chambers they are assigned to
CREATE POLICY "rep_select_assigned_chambers" ON chambers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chamber_assignments
      WHERE chamber_assignments.chamber_id = chambers.id
        AND chamber_assignments.user_id = auth.uid()
    )
  );

-- Sales reps: can see their own assignments
CREATE POLICY "rep_select_own_chamber_assignments" ON chamber_assignments FOR SELECT
  USING (chamber_assignments.user_id = auth.uid());

-- Sales reps: can see events for their assigned chambers
CREATE POLICY "rep_select_chamber_events" ON chamber_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chamber_assignments
      WHERE chamber_assignments.chamber_id = chamber_events.chamber_id
        AND chamber_assignments.user_id = auth.uid()
    )
  );

-- Sales reps: can see their own event assignments
CREATE POLICY "rep_select_own_event_assignments" ON chamber_event_assignments FOR SELECT
  USING (chamber_event_assignments.user_id = auth.uid());

-- Sales reps: can update their own event assignments (confirm/decline)
CREATE POLICY "rep_update_own_event_assignments" ON chamber_event_assignments FOR UPDATE
  USING (chamber_event_assignments.user_id = auth.uid())
  WITH CHECK (chamber_event_assignments.user_id = auth.uid());

-- ─── SEED DATA: 13 Chambers ──────────────────────────────────

INSERT INTO chambers (name, username, password, has_portal, portal_url, portal_label) VALUES
  ('NW Valley Chamber', 'TSMRoofing', 'Roofer#1', true, 'https://surprise.chamberofcommerce.me/members/mlogin.php?org_id=SRCC', 'NW Valley Portal'),
  ('West Valley Chamber', 'jaydenabramsen@tsmroofs.com', 'Roofer#1', true, 'https://westvalleyregionalchamber.com', 'West Valley Portal'),
  ('Phoenix Chamber', 'jaydenabramsen@tsmroofs.com', 'Roofer#1', true, 'https://business.phoenixchamber.com/login', 'Phoenix Portal'),
  ('Scottsdale Chamber', 'info@tsmroofs.com', 'Roofer#1', true, 'https://business.scottsdalechamber.com/login', 'Scottsdale Portal'),
  ('Tempe Chamber', 'TSMRoofing', 'Roofer#1', true, 'https://tempechamberofcommerceaz.growthzoneapp.com/MIC/login', 'Tempe Portal'),
  ('Glendale Chamber', 'TSMRoofing', 'Roofer#1', true, 'https://glendale.chamberofcommerce.me/members/mlogin.php?org_id=GDCC', 'Glendale Portal'),
  ('Peoria Chamber', 'TSMRoofing', 'Roofer#1', true, 'https://www.peoriachamber.com/login/', 'Peoria Portal'),
  ('Wickenburg Chamber', 'TSMRoofing', 'Roofer#1', true, 'https://mms.wickenburgchamber.com/members/mlogin.php?org_id=WICK', 'Wickenburg Portal'),
  ('Fountain Hills Chamber', 'info@tsmroofs.com', 'Roofer#1', true, 'https://fhchamber.com/member-login/', 'Fountain Hills Portal'),
  ('Anthem Chamber', NULL, NULL, false, 'https://www.anthemareachamber.com', 'Anthem Website'),
  ('Carefree-Cave Creek Chamber', NULL, NULL, false, 'https://carefreecavecreek.org/chamber-events/', 'Carefree-Cave Creek Events'),
  ('Prescott Chamber', 'jaydenabramsen@tsmroofs.com', 'Roofer#1', true, 'http://web.prescott.org/portal', 'Prescott Portal'),
  ('Greater Cottonwood Chamber', 'info@tsmroofs.com', 'Roofer#1', true, 'https://business.cottonwoodchamberaz.org/login', 'Cottonwood Portal');
