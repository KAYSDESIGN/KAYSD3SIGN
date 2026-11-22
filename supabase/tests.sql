-- Tests des règles et fonctions serveur (à lancer sur une base locale avec des remplaçants auth/storage, jamais en production).
\set ON_ERROR_STOP 1
insert into auth.users(id) values ('00000000-0000-0000-0000-00000000000a'),('00000000-0000-0000-0000-00000000000b'),('00000000-0000-0000-0000-00000000000c');
create function as_user(u text) returns void language sql as $$ select set_config('request.jwt.sub', u, false) $$;
create function chk(label text, ok boolean) returns text language sql as $$ select (case when ok then 'PASS ' else 'FAIL ' end) || label $$;
set role authenticated;
select as_user('00000000-0000-0000-0000-00000000000a');
update profiles set display_name='Kay' where id = auth.uid();
create temp table code as select create_couple() c;
select as_user('00000000-0000-0000-0000-00000000000b');
update profiles set display_name='Sam' where id = auth.uid();
select join_couple((select c from code)) is not null;
select chk('couple premium d office', couple_is_premium());
-- confidentialité : le partenaire ne peut pas lire la date de naissance
select as_user('00000000-0000-0000-0000-00000000000a');
update profiles set birthdate='1990-03-01', spice_level='hot' where id = auth.uid();
select chk('age confirmé par le serveur', (my_profile()).age_confirmed_at is not null);
select as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin perform birthdate from profiles; raise exception 'should fail'; exception when insufficient_privilege then null; end $$;
select chk('partenaire ne lit pas birthdate', true);
do $$ begin update profiles set age_confirmed_at = now() where id = auth.uid(); raise exception 'should fail'; exception when insufficient_privilege then null; end $$;
select chk('client ne pose pas age_confirmed_at', true);
do $$ begin update profiles set birthdate = '2015-01-01' where id = auth.uid(); raise exception 'should fail'; exception when check_violation then null; end $$;
select chk('mineur refusé', true);
select chk('pas de coquin tant que B non confirmé', json_array_length(get_today('questions')) = 1);
update profiles set birthdate='1993-06-01', spice_level='spicy' where id = auth.uid();
select chk('statut audace = spicy', (get_spice_status()->>'effective') = 'spicy');
select chk('coquin débloqué', json_array_length(get_today('questions')) = 2);
create temp table sq as select (x->'assignment'->>'id')::uuid id, x->'assignment'->'prompt'->>'spice_level' lvl from json_array_elements(get_today('questions')) x where x->'assignment'->>'slot' = 'spicy_question';
select chk('question coquine au niveau spicy', (select lvl from sq) = 'spicy');
-- B baisse à soft -> retirage obligatoire
update profiles set spice_level='soft' where id = auth.uid();
select chk('niveau baissé -> question soft', (select x->'assignment'->'prompt'->>'spice_level' from json_array_elements(get_today('questions')) x where x->'assignment'->>'slot'='spicy_question') = 'soft');
update profiles set spice_level='spicy' where id = auth.uid();
-- révélation
create temp table q as select (x->'assignment'->>'id')::uuid id from json_array_elements(get_today('questions')) x where x->'assignment'->>'slot'='question';
insert into responses(assignment_id, couple_id, user_id, body) select id, my_couple_id(), auth.uid(), 'rep B' from q;
select as_user('00000000-0000-0000-0000-00000000000a');
select chk('A ne voit pas la réponse de B', (daily_view((select id from q))->>'theirs') is null and (daily_view((select id from q))->>'partnerAnswered')::boolean);
insert into responses(assignment_id, couple_id, user_id, body) select id, my_couple_id(), auth.uid(), 'rep A' from q;
select chk('A voit la réponse de B après', daily_view((select id from q))->'theirs'->>'body' = 'rep B');
select chk('streak = 1', (select streak_count from couples) = 1);
-- morpion : A gagne la ligne du haut
create temp table g as select create_game('tic_tac_toe') id;
select play_move((select id from g), 0, 0);
do $$ begin perform play_move((select id from g), 1, 1); raise exception 'should fail'; exception when others then if sqlerrm <> 'not_your_turn' then raise; end if; end $$;
select chk('pas ton tour refusé', true);
select as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin perform play_move((select id from g), 0, 1); raise exception 'should fail'; exception when others then if sqlerrm <> 'invalid_move' then raise; end if; end $$;
select chk('case prise refusée', true);
do $$ begin perform play_move((select id from g), 4, 0); raise exception 'should fail'; exception when others then if sqlerrm <> 'stale_game' then raise; end if; end $$;
select chk('version périmée refusée', true);
select play_move((select id from g), 4, 1);
select as_user('00000000-0000-0000-0000-00000000000a'); select play_move((select id from g), 1, 2);
select as_user('00000000-0000-0000-0000-00000000000b'); select play_move((select id from g), 8, 3);
select as_user('00000000-0000-0000-0000-00000000000a'); select play_move((select id from g), 2, 4);
select chk('A gagne le morpion', (select status = 'finished' and winner_id = '00000000-0000-0000-0000-00000000000a' from games where id = (select id from g)));
-- quatre d'affilée : gravité + victoire verticale de B
create temp table f as select create_game('four_in_row') id;
select play_move((select id from f), 0, 0);
select as_user('00000000-0000-0000-0000-00000000000b'); select play_move((select id from f), 3, 1);
select chk('pion tombe en bas (case 38)', (select state->'board'->>38 from games where id=(select id from f)) = '00000000-0000-0000-0000-00000000000b');
select as_user('00000000-0000-0000-0000-00000000000a'); select play_move((select id from f), 0, 2);
select as_user('00000000-0000-0000-0000-00000000000b'); select play_move((select id from f), 3, 3);
select as_user('00000000-0000-0000-0000-00000000000a'); select play_move((select id from f), 1, 4);
select as_user('00000000-0000-0000-0000-00000000000b'); select play_move((select id from f), 3, 5);
select as_user('00000000-0000-0000-0000-00000000000a'); select play_move((select id from f), 1, 6);
select as_user('00000000-0000-0000-0000-00000000000b'); select play_move((select id from f), 3, 7);
select chk('B gagne en vertical', (select winner_id = '00000000-0000-0000-0000-00000000000b' from games where id = (select id from f)));
-- quiz : score
create temp table z as select start_quiz(md5('hotcouple:z1')::uuid) id;
insert into quiz_answers(session_id, couple_id, question_id, user_id, choice) select (select id from z), my_couple_id(), id, auth.uid(), 0 from quiz_questions where quiz_id = md5('hotcouple:z1')::uuid;
select chk('B ne voit pas les réponses de A avant la fin', (select count(*) from quiz_answers) = 5);
select as_user('00000000-0000-0000-0000-00000000000a');
insert into quiz_answers(session_id, couple_id, question_id, user_id, choice) select (select id from z), my_couple_id(), id, auth.uid(), case when position <= 2 then 0 else 1 end from quiz_questions where quiz_id = md5('hotcouple:z1')::uuid;
select chk('quiz révélé à 40 %', (select status = 'revealed' and match_score = 40 from quiz_sessions where id = (select id from z)));
do $$ begin perform start_quiz(md5('hotcouple:z3')::uuid); raise exception 'should fail'; exception when others then if sqlerrm <> 'premium_required' then raise; end if; end $$;
select chk('quiz Brûlant bloqué au niveau Épicé', true);
-- envies : seuls les oui communs
insert into desire_answers(couple_id, user_id, desire_id, answer) select my_couple_id(), auth.uid(), md5('hotcouple:'||k)::uuid, a from (values ('d01','yes'),('d04','yes'),('d05','no')) v(k,a);
select as_user('00000000-0000-0000-0000-00000000000b');
insert into desire_answers(couple_id, user_id, desire_id, answer) select my_couple_id(), auth.uid(), md5('hotcouple:'||k)::uuid, a from (values ('d01','yes'),('d04','no'),('d05','yes')) v(k,a);
select chk('B ne lit que ses réponses', (select count(*) from desire_answers) = 3);
select chk('1 seul match (d01)', (select count(*) from mutual_desires()) = 1);
-- intrus
select as_user('00000000-0000-0000-0000-00000000000c');
select chk('intrus ne voit rien', (select count(*) from couples) + (select count(*) from responses) + (select count(*) from games) + (select count(*) from messages) = 0);
select chk('intrus : get_today vide', json_array_length(get_today('questions')) = 0);
-- rejoindre avec un code annule sa propre invitation en attente
reset role;
insert into auth.users(id) values ('00000000-0000-0000-0000-0000000000d1'),('00000000-0000-0000-0000-0000000000d2');
set role authenticated;
select as_user('00000000-0000-0000-0000-0000000000d1'); create temp table c1 as select create_couple() c;
select as_user('00000000-0000-0000-0000-0000000000d2'); create temp table c2 as select create_couple() c;
select join_couple((select c from c1)) is not null;
select chk('D2 a rejoint D1, son invitation a disparu', (select count(*) from couple_members where couple_id = my_couple_id()) = 2);
