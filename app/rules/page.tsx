export default function RulesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-8 md:p-12">
        <a href="/" className="text-purple-600 hover:text-purple-700 font-medium mb-6 inline-block">
          ← Back to Home
        </a>
        
        <h1 className="text-5xl font-bold text-gray-800 mb-6">Impostor — Game Rules</h1>
        
        <section className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Overview</h2>
          <p className="text-gray-700 leading-relaxed">
            Impostor is a social deduction game for 4–6 players. All players share the same secret 
            topic—except one, the Impostor, who must deduce the topic without being exposed. Players 
            ask and answer short, directed questions to identify the Impostor before time runs out.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Setup</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>A category is selected (e.g., Household Items)</li>
            <li>One topic within the category is chosen (hidden)</li>
            <li>All players except one receive the topic</li>
            <li>One player is randomly assigned as the Impostor and does not see the topic</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Game Structure</h2>
          <p className="text-gray-700 mb-4">The game lasts up to two rounds.</p>
          
          <h3 className="text-2xl font-bold text-gray-800 mb-3">Round 1</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Each player may ask up to two questions</li>
            <li>Questions are directed at a specific player</li>
            <li>Questions are limited in length (15 words)</li>
            <li>Questions are optional (players may skip remaining questions)</li>
            <li>Players may receive only one question at a time</li>
            <li>Players must answer or pass before receiving another question</li>
          </ul>

          <h3 className="text-2xl font-bold text-gray-800 mb-3">Answering</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>The targeted player has a limited time to respond</li>
            <li>If they do not respond in time, the question is marked as Pass</li>
            <li>All questions and responses are publicly visible</li>
          </ul>

          <h3 className="text-2xl font-bold text-gray-800 mb-3">Voting (After Round 1)</h3>
          <p className="text-gray-700 mb-3">
            Once all questions are resolved (or all players choose to vote):
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
            <li>Each player votes for who they believe is the Impostor</li>
          </ul>
          
          <h4 className="text-xl font-bold text-gray-800 mb-2">Outcomes</h4>
          <div className="bg-purple-50 p-4 rounded-lg mb-4">
            <p className="font-semibold text-gray-800 mb-2">If the Impostor receives a majority vote:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
              <li>They reveal themselves</li>
              <li>They get one chance to guess the topic</li>
              <li>Correct → Impostor wins</li>
              <li>Incorrect → Impostor loses</li>
            </ul>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <p className="font-semibold text-gray-800 mb-2">If the Impostor does NOT receive a majority:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
              <li>The player with the most votes is eliminated</li>
              <li>In case of a tie, no one is eliminated</li>
              <li>The game proceeds to Round 2</li>
            </ul>
          </div>

          <h3 className="text-2xl font-bold text-gray-800 mb-3">Round 2</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
            <li>Remaining players may ask one question each</li>
            <li>Questioning follows the same rules as Round 1</li>
            <li>After questions, a final vote is held</li>
          </ul>

          <h4 className="text-xl font-bold text-gray-800 mb-2">Final Outcomes</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>If the Impostor receives a majority vote: The Impostor loses immediately (no topic guess)</li>
            <li>If the Impostor does NOT receive a majority: The Impostor wins</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Winning Conditions</h2>
          
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <h3 className="text-xl font-bold text-red-800 mb-2">Impostor wins if:</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>They correctly guess the topic after being identified in Round 1, or</li>
              <li>They survive the final vote in Round 2</li>
            </ul>
          </div>

          <div className="bg-green-50 border-l-4 border-green-500 p-4">
            <h3 className="text-xl font-bold text-green-800 mb-2">Non-Impostors win if:</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>The Impostor is correctly voted out in Round 2, or</li>
              <li>The Impostor fails to guess the topic after being identified in Round 1</li>
            </ul>
          </div>
        </section>

        <div className="text-center pt-8 border-t border-gray-200">
          <a
            href="/lobby"
            className="bg-purple-600 text-white font-bold text-xl px-8 py-4 rounded-full hover:bg-purple-700 transition-colors inline-block"
          >
            Play Now
          </a>
        </div>
      </div>
    </div>
  );
}

