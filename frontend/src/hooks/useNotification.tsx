import { useNotification as useBlockscoutNotification } from "@blockscout/app-sdk";

interface CustomNotificationProps {
  txHash: string;
  comment?: string;
}

export const useNotification = () => {
  const blockscout = useBlockscoutNotification();

  const notify = async ({ txHash, comment }: CustomNotificationProps) => {
    if (!txHash) return;

    try {
      // Step 1: Blockscout toast for Flow EVM Testnet (Chain ID: 545)
      await blockscout.openTxToast("545", txHash);

      // Step 2: Browser notification with comment
      if ("Notification" in window) {
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }

        if (Notification.permission === "granted") {
          new Notification("Transaction Sent", {
            body: comment
              ? `${comment}\nTxn: ${txHash.slice(0, 6)}...${txHash.slice(-4)}`
              : `Txn: ${txHash.slice(0, 6)}...${txHash.slice(-4)}`,
            icon: "/vite.svg",
          });
        }
      }

      console.log("Notification sent successfully", { txHash, comment });
    } catch (error) {
      console.error("Notification failed:", error);

      // Step 3: Fallback - open in Flow EVM Testnet explorer
      const url = `https://evm-testnet.flowscan.io/tx/${txHash}`;
      window.open(url, "_blank");

      // Show comment in fallback notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Transaction Fallback", {
          body: comment
            ? `${comment}\nOpened in FlowScan: ${txHash.slice(0, 6)}...${txHash.slice(-4)}`
            : `Opened in FlowScan: ${txHash.slice(0, 6)}...${txHash.slice(-4)}`,
          icon: "/vite.svg",
        });
      }
    }
  };

  return { notify };
};
