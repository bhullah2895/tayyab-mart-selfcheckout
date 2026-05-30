import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: "30px", fontFamily: "Arial" }}>
      <h1>Tayyab Mart Self Checkout</h1>
      <p>Select where you want to go:</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Link href="/kiosk">Cusotmer interface</Link>
        <Link href="/cashier">Cashier</Link>
        <Link href="/admin">Admin</Link>
      </div>
    </main>
  );
}