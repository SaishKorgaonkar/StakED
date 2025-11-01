import express from "express";
import User from "../models/User.js";
import Stake from "../models/Stake.js";
import Class from "../models/Class.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @route GET /api/users/profile
 * @desc Get current user profile
 * @access Private
 */
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select("username walletAddress role createdAt")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("Error fetching user profile:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
    });
  }
});

/**
 * @route PUT /api/users/profile
 * @desc Update user profile
 * @access Private
 */
router.put("/profile", verifyToken, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { username: username.trim() },
      { new: true } 
    ).select("username walletAddress role createdAt"); 

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Error updating user profile:", err);
    res.status(500).json({
      success: false,
      message: "Error updating profile",
    });
  }
});

/**
 * @route PUT /api/users/update-wallet
 * @desc Update user wallet address
 * @access Private
 */
router.put("/update-wallet", verifyToken, async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress || !walletAddress.trim()) {
      return res.status(400).json({
        success: false,
        message: "Wallet address is required",
      });
    }

    // Validate Ethereum address format
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(walletAddress.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid Ethereum address format",
      });
    }

    // Check if wallet address is already in use by another user
    const existingUser = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase(),
      _id: { $ne: req.user.userId }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "This wallet address is already registered to another user",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { walletAddress: walletAddress.toLowerCase() },
      { new: true } 
    ).select("username walletAddress role createdAt"); 

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Wallet address updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Error updating wallet address:", err);
    res.status(500).json({
      success: false,
      message: "Error updating wallet address",
    });
  }
});

/**
 * @route GET /api/users/analytics
 * @desc Get user analytics (wins, losses, earnings)
 * @access Private
 */
router.get("/analytics", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Fetch all stakes for this user
    const stakes = await Stake.find({ student: userId })
      .populate('exam', 'name maxMarks')
      .populate('class', 'name')
      .lean();

    // Calculate analytics
    let totalStaked = 0;
    let totalEarnings = 0;
    let stakesWon = 0;
    let stakesLost = 0;
    let stakesPending = 0;
    const examResults = [];
    const winRateHistory = [];

    // Get unique classes for classesJoined count
    const uniqueClasses = new Set(stakes.map(s => s.class?._id?.toString()).filter(Boolean));

    stakes.forEach(stake => {
      totalStaked += stake.stakeAmount;

      if (stake.isClaimed && stake.isWinner) {
        // Won and claimed
        stakesWon++;
        totalEarnings += (stake.rewardAmount || 0);
        
        examResults.push({
          exam: stake.exam?.name || 'Unknown Exam',
          netReward: (stake.rewardAmount || 0) - stake.stakeAmount,
          status: 'won'
        });
      } else if (stake.isWinner === false) {
        // Lost
        stakesLost++;
        totalEarnings -= stake.stakeAmount; // Lost the stake
        
        examResults.push({
          exam: stake.exam?.name || 'Unknown Exam',
          netReward: -stake.stakeAmount,
          status: 'lost'
        });
      } else if (stake.isWinner === true && !stake.isClaimed) {
        // Won but not claimed yet
        stakesWon++;
        stakesPending++;
        
        examResults.push({
          exam: stake.exam?.name || 'Unknown Exam',
          netReward: 0, // Not claimed yet
          status: 'pending_claim'
        });
      } else {
        // Still pending (exam not graded)
        stakesPending++;
        
        examResults.push({
          exam: stake.exam?.name || 'Unknown Exam',
          netReward: 0,
          status: 'pending'
        });
      }
    });

    // Calculate win rate
    const totalCompleted = stakesWon + stakesLost;
    const winRate = totalCompleted > 0 ? (stakesWon / totalCompleted) * 100 : 0;

    // Generate win rate history (sorted by date)
    const sortedStakes = [...stakes].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let cumulativeWins = 0;
    let cumulativeTotal = 0;

    sortedStakes.forEach((stake, index) => {
      if (stake.isWinner !== null) {
        cumulativeTotal++;
        if (stake.isWinner) cumulativeWins++;

        const date = new Date(stake.createdAt);
        winRateHistory.push({
          date: date.toISOString().split('T')[0],
          winRate: cumulativeTotal > 0 ? (cumulativeWins / cumulativeTotal) * 100 : 0,
          period: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          stakesWon: cumulativeWins,
          stakesTotal: cumulativeTotal,
          examResult: stake.exam?.name,
          examId: stake.exam?._id
        });
      }
    });

    res.json({
      success: true,
      analytics: {
        totalStaked: totalStaked.toFixed(4),
        totalStakesWon: stakesWon,
        totalStakesLost: stakesLost,
        stakesPending,
        winRate: Math.round(winRate * 100) / 100,
        totalEarnings: totalEarnings.toFixed(4),
        totalEarningsValue: totalEarnings,
        classesJoined: uniqueClasses.size,
        examResults,
        winRateHistory
      }
    });
  } catch (err) {
    console.error("Error fetching user analytics:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching analytics",
    });
  }
});

export default router;
