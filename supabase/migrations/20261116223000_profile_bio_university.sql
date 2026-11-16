alter table public.profiles
  add column bio text,
  add column university_name text,
  add constraint profiles_bio_length_check
    check (bio is null or char_length(btrim(bio)) <= 500),
  add constraint profiles_university_name_length_check
    check (
      university_name is null
      or char_length(btrim(university_name)) between 2 and 160
    );

grant update (bio, university_name)
  on public.profiles to authenticated;
