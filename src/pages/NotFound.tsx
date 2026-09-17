import { motion } from "framer-motion";
import { VStarzLogo } from "@/components/VStarzLogo";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex min-h-screen flex-col"
    >
      {/* Main Content */}
      <div className="relative flex flex-1 flex-col items-center justify-center">
        <div className="absolute inset-0 bg-stage-grid opacity-30" />
        <div className="relative mx-auto max-w-5xl px-4 text-center">
          <div className="mb-6 flex items-center justify-center gap-2.5">
            <VStarzLogo className="size-10" glow={false} />
            <span className="font-display text-2xl font-bold">VStarz</span>
          </div>
          <h1 className="font-display text-7xl font-bold text-gradient-roc">
            404
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            This stage doesn't exist.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            The page you're looking for has left the building.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/"
              className="rounded-lg bg-primary px-6 py-2.5 font-mont text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
            >
              Back to home
            </Link>
            <Link
              to="/dashboard"
              className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
