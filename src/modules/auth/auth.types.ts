/** Shape of the JWT payload we sign and later decode in the guard */
export interface JwtPayload {
  sub: string;   // user id
  username: string;
  email: string;
}

/** Augment Express Request so req.user is typed everywhere */
export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
}
