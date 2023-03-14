import logo from './logo.svg';
import './App.css';
import idl from "./idl.json";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, AnchorProvider, web3, utils, BN } from "@project-serum/anchor";
import { useEffect, useState } from "react";
import { Buffer } from "buffer";
window.Buffer = Buffer;

const programID = new PublicKey(idl.metadata.address);
const network = clusterApiUrl("devnet");
const opts = {
  preflightCommitment: "finalized",
};
const { SystemProgram } = web3;

const App = () => {
  const[walletAddress, setWalletAddress] = useState(null);
  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new AnchorProvider(connection, window.solana, opts.preflightCommitment);
    return provider;
  }
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;
      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom wallet found!");
          const response = await solana.connect({
					  onlyIfTrusted: true,
					});
          console.log(
            "Connected with public key:", 
            response.publicKey.toString()
          );
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert("Solana objet not found!");
      }
    } catch(error){
      console.error(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;
    if (solana) {
      const response = await solana.connect();
      console.log(
        "connected with public key:",
        response.publicKey.toString()
      );
      setWalletAddress(response.publicKey.toString());
    }
  };

  const createTicket = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const [ticket] = await PublicKey.findProgramAddressSync(
        [
          utils.bytes.utf8.encode("TICKET_DEMO"),
          provider.wallet.publicKey.toBuffer(),
        ],
        program.programId
      );
      await program.rpc.create("img_url", "event name", "event description", new BN(0.2 * web3.LAMPORTS_PER_SOL), {
        accounts: {
          ticket,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
      });
      console.log(
        "Created a new ticket w/ address:",
        ticket.toString()
      );
    } catch (error) {
      console.error("Error creating ticket acount", error);
    }
  };
 
  const renderNotConnectedContainer = () => (
    <button onClick={connectWallet}>Connect to wallet</button>
  );

  const renderConnectedContainer = () => (
    <>
      <button onClick={createTicket}>Create a ticket</button>
      {/* <button onClick={getCollectable}>Get a list of collectables</button> */}
      <br/>
      {/* {collectables.map(collectable => (
        <>
          <p>Collectable ID: {collectable.pubkey.toString()}</p>
          <p>Balance: {(collectable.amountD / web3.LAMPORTS_PER_SOL).toString()}</p>
          <p>{collectable.name}</p>
          <p>{collectable.description}</p>
          <button onClick={() => setbind(collectable.pubkey)}>
            Click to bind
          </button>
          <button onClick={() => withdraw(collectable.pubkey)}>
            Click to whithdraw
          </button>
          <br/>
        </>
      ))} */}
    </>
  );
 
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  },[]);

  return ( 
    <div className="App">
      {!walletAddress && renderNotConnectedContainer()}
      {walletAddress && renderConnectedContainer()}
    </div>
  );

};

export default App;
