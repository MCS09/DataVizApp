
import {GitHubLoginButton, GoogleLoginButton} from "./components/loginButton";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center ">
      <div className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Welcome Back
        </h2>
        <p className="text-center text-slate-600 mb-8">
          Sign in with your favorite account
        </p>
        
        <div className="space-y-4">
          <GitHubLoginButton redirectTo="/" />
          <GoogleLoginButton redirectTo="/" />
        </div>

        <div className="mt-6 text-center text-sm text-slate-500">
          By signing in, you agree to our{" "}
          <a href="/terms" className="text-purple-600 hover:underline">Terms</a> and{" "}
          <a href="/privacy" className="text-purple-600 hover:underline">Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
}
