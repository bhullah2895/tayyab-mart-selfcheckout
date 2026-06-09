import Link from "next/link";

const options = [
    {
    title: "Admin",
    description: "Manage products, sessions, reports, and system settings.",
    href: "/admin",
    icon: "⚙️",
    color: "from-gray-700 to-gray-950",
  },
  {
    title: "Cashier",
    description: "Review customer carts and confirm payments.",
    href: "/cashier",
    icon: "💳",
    color: "from-blue-500 to-indigo-700",
  },
    {
    title: "Customer Session",
    description: "Start a self-checkout session and scan products.",
    href: "/kiosk",
    icon: "🛒",
    color: "from-green-500 to-emerald-700",
  },

];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-100">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-5 py-10">
        <div className="mb-10 text-center">


          <p className="text-sm font-bold uppercase tracking-[0.25em] text-green-700">
            Welcome to
          </p>

          <h1 className="mt-3 text-5xl font-black text-gray-950 md:text-7xl">
            Tayyab Mart
          </h1>

          <h2 className="mt-3 text-2xl font-extrabold text-gray-700 md:text-3xl">
            Self Checkout System
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-gray-500">
            Fast, simple, and smart checkout experience for customers, cashiers,
            and administrators.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {options.map((option) => (
            <Link
              key={option.href}
              href={option.href}
              className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className={`h-2 bg-gradient-to-r ${option.color}`} />

              <div className="p-6">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-4xl transition group-hover:scale-110">
                  {option.icon}
                </div>

                <h3 className="text-2xl font-black text-gray-950">
                  {option.title}
                </h3>

                <p className="mt-3 min-h-[48px] text-sm leading-6 text-gray-500">
                  {option.description}
                </p>

                <div className="mt-6 flex items-center justify-between">
                  <span className="font-bold text-green-700">
                    Open
                  </span>

                  <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-black text-green-700 transition group-hover:bg-green-700 group-hover:text-white">
                    →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

      </section>
    </main>
  );
}