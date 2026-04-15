import { motion, AnimatePresence } from "framer-motion";

type NotificationProps = {
  type: "success" | "error";
  message: string;
};

export default function Notification({ type, message }: NotificationProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ duration: 0.3 }}
        className={`mb-4 p-4 rounded-lg text-white ${
          type === "success" ? "bg-green-500" : "bg-red-500"
        }`}
        role="alert"
      >
        {message}
      </motion.div>
    </AnimatePresence>
  );
}