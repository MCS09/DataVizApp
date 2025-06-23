
import GitHubLoginButton from "./components/githubLoginButton";

export default function LoginPage() {
  return (
    <div className="bg-base-100 p-8 rounded-lg shadow-lg w-full max-w-sm">
      <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
      <GitHubLoginButton redirectTo="/data"/>
    </div>
    
  )
}