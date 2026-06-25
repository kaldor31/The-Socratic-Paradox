--
-- The Socratic Paradox
-- Seed data: default cognitive distortions and Socratic prompts
--

BEGIN;

-- Cognitive distortions
INSERT INTO distortions (slug, label, description, color_accent) VALUES
    ('catastrophizing', 'Catastrophizing', 'Predicting the worst possible outcome and assuming it is inevitable.', '#ef4444'),
    ('mind_reading', 'Mind Reading', 'Believing you know what others are thinking without sufficient evidence.', '#f59e0b'),
    ('all_or_nothing', 'All-or-Nothing Thinking', 'Viewing situations in black-and-white categories with no middle ground.', '#8b5cf6'),
    ('emotional_reasoning', 'Emotional Reasoning', 'Assuming that because you feel something, it must be true.', '#ec4899'),
    ('should_statements', 'Should Statements', 'Imposing rigid rules on yourself or others with "must", "should", or "ought".', '#3b82f6'),
    ('mental_filter', 'Mental Filter', 'Focusing exclusively on a single negative detail while ignoring the wider context.', '#10b981'),
    ('labeling', 'Labeling', 'Assigning a global, fixed label to yourself or others based on a single event.', '#f97316'),
    ('personalization', 'Personalization', 'Taking excessive responsibility for external events outside your control.', '#6366f1')
ON CONFLICT (slug) DO NOTHING;

-- Socratic prompts, grouped by interrogation stage
INSERT INTO socratic_prompts (category, slug, text, sort_order) VALUES
    ('clarification', 'what_do_you_mean', 'What exactly do you mean by that? Can you state it in different words?', 10),
    ('clarification', 'evidence_for', 'What is the strongest evidence that supports this thought?', 20),
    ('clarification', 'evidence_against', 'What evidence, if any, contradicts this thought?', 30),
    ('assumption', 'what_are_you_assuming', 'What are you assuming beneath this thought? Is that assumption solid?', 40),
    ('assumption', 'alternative_explanation', 'What is another plausible explanation for what happened?', 50),
    ('perspective', 'what_would_advise', 'If a close friend held this thought, what would you advise them?', 60),
    ('perspective', 'view_from_above', 'Viewed from a distance, how significant is this problem likely to be?', 70),
    ('consequence', 'worst_case', 'What is the worst that could realistically happen? Could you cope with it?', 80),
    ('consequence', 'best_case', 'What is the best possible outcome? What is the most likely outcome?', 90),
    ('meaning', 'what_learn', 'What does this teach you about the situation, not about yourself as a person?', 100),
    ('action', 'what_now', 'Given what you have examined, what is the most rational next step?', 110)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
