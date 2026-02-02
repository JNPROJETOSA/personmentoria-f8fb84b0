CREATE OR REPLACE FUNCTION admin_create_user(
    new_email TEXT,
    new_password TEXT,
    new_role TEXT,
    new_name TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres/supabase_admin)
AS $$
DECLARE
    executing_user_role TEXT;
    target_user_id UUID;
    encrypted_pw TEXT;
    is_new_user BOOLEAN := FALSE;
BEGIN
    -- 1. Check if the executing user is an admin
    SELECT role INTO executing_user_role
    FROM public.admin_whitelist
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid());

    IF executing_user_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can create users.';
    END IF;

    -- 2. Check if user already exists
    SELECT id INTO target_user_id FROM auth.users WHERE email = new_email;

    IF target_user_id IS NULL THEN
        -- Create new user
        is_new_user := TRUE;
        encrypted_pw := crypt(new_password, gen_salt('bf'));
        target_user_id := gen_random_uuid();

        -- Insert into auth.users
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            target_user_id,
            'authenticated',
            'authenticated',
            new_email,
            encrypted_pw,
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            json_build_object('name', new_name),
            FALSE,
            NOW(),
            NOW()
        );

        -- Insert into auth.identities
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            target_user_id,
            json_build_object('sub', target_user_id, 'email', new_email),
            'email',
            new_email,
            NULL,
            NOW(),
            NOW()
        );
    ELSE
        -- Update existing user password if provided
        IF new_password IS NOT NULL AND new_password <> '' THEN
            encrypted_pw := crypt(new_password, gen_salt('bf'));
            UPDATE auth.users
            SET encrypted_password = encrypted_pw,
                email_confirmed_at = NOW(),
                updated_at = NOW()
            WHERE id = target_user_id;
        ELSE
             -- Even if password is not changed, ensure email is confirmed if admin 'approves' them
             UPDATE auth.users
             SET email_confirmed_at = NOW(),
                 updated_at = NOW()
             WHERE id = target_user_id;
        END IF;
    END IF;

    -- 3. Insert/Update public.admin_whitelist (Always ensure correct role)
    INSERT INTO public.admin_whitelist (email, role, created_by)
    VALUES (new_email, new_role, auth.uid())
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

    RETURN json_build_object(
        'id', target_user_id, 
        'email', new_email, 
        'status', CASE WHEN is_new_user THEN 'created' ELSE 'existing_updated' END
    );
END;
$$;
