import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Flow EVM Testnet configuration
const FLOW_EVM_TESTNET_API = "https://evm-testnet.flowscan.io/api";

/**
 * GET /api/analytics/transactions/:address
 * Fetch transaction data from Flow EVM testnet explorer
 */
router.get('/transactions/:address', verifyToken, async (req, res) => {
  try {
    const { address } = req.params;
    const { page = 1, offset = 100 } = req.query;
    
    console.log(`📊 Fetching analytics for address: ${address}`);
    
    // Validate address format
    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address format'
      });
    }
    
    // Fetch transactions from Flow EVM testnet
    const apiUrl = `${FLOW_EVM_TESTNET_API}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=${offset}&sort=desc`;
    
    console.log(`📡 Calling Flow EVM API: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Flow EVM API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== "1") {
      console.warn('Flow EVM API returned non-success status:', data);
      return res.json({
        success: true,
        transactions: [],
        message: data.message || 'No transactions found'
      });
    }
    
    console.log(`✅ Found ${data.result?.length || 0} transactions`);
    
    res.json({
      success: true,
      transactions: data.result || [],
      total: data.result?.length || 0
    });
    
  } catch (error) {
    console.error('❌ Analytics fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction data',
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/balance/:address
 * Fetch FLOW balance for an address
 */
router.get('/balance/:address', verifyToken, async (req, res) => {
  try {
    const { address } = req.params;
    
    // Validate address format
    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address format'
      });
    }
    
    const apiUrl = `${FLOW_EVM_TESTNET_API}?module=account&action=balance&address=${address}`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Flow EVM API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== "1") {
      return res.json({
        success: false,
        message: data.message || 'Failed to fetch balance'
      });
    }
    
    // Convert from wei to FLOW (18 decimals)
    const balanceWei = data.result;
    const balanceFlow = parseFloat(balanceWei) / Math.pow(10, 18);
    
    res.json({
      success: true,
      balance: {
        wei: balanceWei,
        flow: balanceFlow.toFixed(6)
      }
    });
    
  } catch (error) {
    console.error('❌ Balance fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch balance',
      error: error.message
    });
  }
});

export default router;