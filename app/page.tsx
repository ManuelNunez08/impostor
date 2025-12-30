export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center text-white">
        <h1 className="text-6xl md:text-8xl font-bold mb-6 drop-shadow-lg">
          Impostor
          </h1>
        <p className="text-xl md:text-2xl mb-8 opacity-90">
          A social deduction game where one player must blend in without knowing the secret topic
        </p>
        
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 mb-8 border border-white/20">
          <h2 className="text-2xl font-semibold mb-4">How to Play</h2>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="bg-white/5 p-4 rounded-lg">
              <div className="text-4xl mb-2">🎭</div>
              <h3 className="font-bold mb-2">Get Your Role</h3>
              <p className="text-sm opacity-90">
                Most players see the secret topic. One Impostor does not.
              </p>
            </div>
            <div className="bg-white/5 p-4 rounded-lg">
              <div className="text-4xl mb-2">❓</div>
              <h3 className="font-bold mb-2">Ask Questions</h3>
              <p className="text-sm opacity-90">
                Players ask each other questions to find the Impostor.
              </p>
            </div>
            <div className="bg-white/5 p-4 rounded-lg">
              <div className="text-4xl mb-2">🗳️</div>
              <h3 className="font-bold mb-2">Vote & Win</h3>
              <p className="text-sm opacity-90">
                Vote out the Impostor or let them guess the topic to win!
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/lobby"
            className="bg-white text-purple-600 font-bold text-xl px-8 py-4 rounded-full hover:bg-opacity-90 transition-all hover:scale-105 shadow-xl"
          >
            Play Now
          </a>
          <a
            href="/rules"
            className="bg-white/20 backdrop-blur-sm text-white font-bold text-xl px-8 py-4 rounded-full hover:bg-white/30 transition-all border border-white/30"
          >
            Full Rules
          </a>
        </div>

        <div className="mt-12 text-sm opacity-75">
          <p>4-6 Players • 10-15 Minutes • Ages 12+</p>
        </div>
      </div>
    </div>
  );
}
