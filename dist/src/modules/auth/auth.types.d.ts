export interface JwtPayload {
    sub: string;
    username: string;
    email: string;
}
export interface AuthenticatedUser {
    id: string;
    username: string;
    email: string;
}
