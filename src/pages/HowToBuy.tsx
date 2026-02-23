import Header from '@/components/Header';

const HowToBuy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <h1 className="text-sm font-medium tracking-widest">HOW TO BUY MONERO</h1>

        <div className="space-y-6 text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-medium">1. GET A WALLET</h2>
            <p className="opacity-80">
              Download the official Monero GUI wallet from getmonero.org, or use a mobile wallet 
              like Cake Wallet (iOS/Android) or Monerujo (Android).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-medium">2. BUY XMR</h2>
            <p className="opacity-80">
              Purchase Monero (XMR) from exchanges like Kraken, Binance, or use decentralized 
              options like LocalMonero or Bisq for maximum privacy. You can also swap 
              Bitcoin or other crypto for XMR using services like Trocador or ChangeNow.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-medium">3. SEND PAYMENT</h2>
            <p className="opacity-80">
              After placing an order, you'll receive an XMR address and amount. Open your wallet, 
              paste the address, enter the exact amount, and send. Monero transactions typically 
              confirm within 2-20 minutes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-medium">4. TRACK YOUR ORDER</h2>
            <p className="opacity-80">
              After payment, your order status will update. You'll receive a shareable tracking 
              link to monitor progress from pending → confirmed → shipped → delivered.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default HowToBuy;
