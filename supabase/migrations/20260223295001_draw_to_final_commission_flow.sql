-- Draw-to-Final Commission flow: store draw amount paid and closed-out state
-- When rep closes out a paid draw, we convert it to final commission submission

ALTER TABLE public.commission_submissions
ADD COLUMN IF NOT EXISTS draw_amount_paid numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS draw_closed_out boolean DEFAULT false;

COMMENT ON COLUMN public.commission_submissions.draw_amount_paid IS 'Amount paid as draw advance; set when rep closes out job and requests final commission.';
COMMENT ON COLUMN public.commission_submissions.draw_closed_out IS 'True when a draw has been closed out and final commission submitted; record shows both draw + final amounts.';
