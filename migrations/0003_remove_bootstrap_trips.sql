-- Early builds inserted a public bootstrap trip without a creator. Real trips
-- are always created by an authenticated user, so remove those bootstrap rows
-- and their cascading memberships and invites.
DELETE FROM trips WHERE created_by IS NULL;
