// Debug script to test FLOW balance in browser console
// 1. Open your frontend in browser
// 2. Open developer console (F12)
// 3. Copy and paste this entire script
// 4. Run it to see your actual FLOW balance

async function debugFlowBalance() {
    console.log('🔧 Debugging FLOW balance...');
    
    try {
        // Check if MetaMask is available
        if (!window.ethereum) {
            console.error('❌ MetaMask not found');
            return;
        }
        
        console.log('1. MetaMask detected ✅');
        
        // Connect to MetaMask
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        console.log('2. Wallet connected ✅');
        console.log('   Your address:', address);
        
        // Check current network
        const network = await provider.getNetwork();
        console.log('3. Network check:');
        console.log('   Chain ID:', network.chainId.toString());
        console.log('   Network name:', network.name);
        
        if (network.chainId !== 545n) {
            console.error('❌ Wrong network! You need to switch to Flow EVM Testnet (Chain ID: 545)');
            console.log('💡 Add this network to MetaMask:');
            console.log('   Network Name: Flow EVM Testnet');
            console.log('   RPC URL: https://testnet.evm.nodes.onflow.org');
            console.log('   Chain ID: 545');
            console.log('   Currency Symbol: FLOW');
            return;
        }
        
        console.log('4. Network correct ✅ (Flow EVM Testnet)');
        
        // Get FLOW balance
        const balanceWei = await provider.getBalance(address);
        const balance = ethers.formatUnits(balanceWei, 18);
        
        console.log('5. Balance check:');
        console.log('   Raw balance (wei):', balanceWei.toString());
        console.log('   Formatted balance:', balance, 'FLOW');
        
        if (parseFloat(balance) === 0) {
            console.warn('⚠️  Your wallet has 0 FLOW tokens!');
            console.log('💡 You need to get FLOW tokens from a faucet or someone else');
        } else {
            console.log('✅ You have FLOW tokens!');
        }
        
        // Test the exact same method as frontend
        console.log('6. Testing frontend method...');
        const testBalance = parseFloat(balance).toFixed(4);
        console.log('   Frontend will display:', testBalance, 'FLOW');
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.log('💡 Make sure you:');
        console.log('   1. Have MetaMask installed');
        console.log('   2. Are connected to Flow EVM Testnet');
        console.log('   3. Have approved the connection');
    }
}

// Run the debug function
debugFlowBalance();