import { AuthForm } from "../auth-form";

// Se resuelve en build: el botón de Google solo existe si hay credenciales.
const GOOGLE = Boolean(process.env.GOOGLE_CLIENT_ID);

export default function LoginPage() {
  return <AuthForm mode="login" google={GOOGLE} />;
}
