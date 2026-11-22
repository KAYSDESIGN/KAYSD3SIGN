-- Description courte affichée dans la liste des quiz
alter table public.quizzes add column if not exists blurb text not null default '';
