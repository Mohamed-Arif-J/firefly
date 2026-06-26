// Test client for the agent API
// Run with: npx tsx src/app/api/test-client.ts

const testChaosDumps = [
  `I need to prepare for the client meeting on Friday. There's the presentation deck that needs updating, especially the financials section. Also need to coordinate with marketing for the campaign review, and check in with dev team about the Q3 roadmap. Oh and don't forget to send out the pre-meeting agenda by Wednesday.`,
  
  `Got a bunch of stuff piling up: fix the bug in user authentication that's been reported, update the deployment docs for the new infra, respond to customer support tickets that have been waiting, and start planning the team offsite for next month.`,
  
  `Brain dump: learn React Server Components for the new project, write blog post about AI productivity tools, clean up GitHub issues backlog, schedule 1:1s with team members, review PRs that are pending, and think about the architecture for the new microservices.`
];

async function testAgentAPI() {
  console.log('🧪 Testing Firefly AI Agent API\n');
  
  for (let index = 0; index < testChaosDumps.length; index++) {
    const chaosDump = testChaosDumps[index];
    console.log(`Test ${index + 1}:`);
    console.log(`Input: "${chaosDump.substring(0, 100)}..."`);
    
    try {
      const response = await fetch('http://localhost:3000/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskInput: chaosDump }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('✅ Success!');
        console.log('Task extracted:', data.task.title);
        console.log('Urgency:', data.task.urgencyScore);
        console.log('Estimated hours:', data.task.estimatedHours);
        console.log('Immediate step:', data.task.immediateFirstStep);
        console.log('Deadline:', new Date(data.task.deadline).toLocaleDateString());
        console.log('Checklist items:', data.task.actionableChecklist.length);
      } else {
        console.log('❌ Error:', data.error || 'Unknown error');
      }
    } catch (error: any) {
      console.log('❌ Request failed:', error.message);
    }
    
    console.log('---\n');
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  console.log('Note: This test requires the server to be running on http://localhost:3000');
  console.log('Start the server with: npm run dev\n');
  
  testAgentAPI().catch(console.error);
}

export { testAgentAPI };