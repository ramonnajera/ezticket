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
  const [tickets, setTickets] = useState([]);
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

  const getTickets = async () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = getProvider();
    const program = new Program(idl, programID, provider);
      Promise.all(
        (await connection.getProgramAccounts(programID)).map(
          async (ticket) => ({
            ...(await program.account.ticket.fetch(ticket.pubkey)),
            pubkey: ticket.pubkey,
          })
        )
      ).then((tickets) => setTickets(tickets));
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

  const setpay = async (publicKey, price) => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.buy(new BN(price * web3.LAMPORTS_PER_SOL),{
        accounts: {
          ticket: publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
      });
      console.log("Pay to:", publicKey.toString());
      getTickets();
    } catch (error) {
      console.error("Error pay", error);
    }
  };

  const withdraw = async (publicKey) => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const connection = new Connection(network, opts.preflightCommitment);
      const balance = await connection.getBalance(publicKey) / web3.LAMPORTS_PER_SOL;

      console.log("Mi balance", parseInt(balance * 10, 10) / 10);

      await program.rpc.withdraw(new BN((parseInt(balance * 10, 10) / 10) * web3.LAMPORTS_PER_SOL),{
        accounts: {
          ticket: publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("Success whithdrawing from:", publicKey.toString());
    } catch (error) {
      console.error("Error whithdrawing",error);
    }
  };
 
  const renderNotConnectedContainer = () => (
    <button onClick={connectWallet}>Connect to wallet</button>
  );

  const renderConnectedContainer = () => (
    <>
      <button onClick={createTicket}>Create a ticket</button>
      <button onClick={getTickets}>Get a list of events</button>
      <br/>
      {tickets.map(ticket => (
        <>
          <p>event ID: {ticket.pubkey.toString()}</p>
          <p>Balance: {(ticket.amountD / web3.LAMPORTS_PER_SOL).toString()} SOL</p>
          <p>{ticket.img}</p>
          <p>{ticket.name}</p>
          <p>{ticket.description}</p>
          <p>{ticket.price / web3.LAMPORTS_PER_SOL} SOL</p>
          <button onClick={() => setpay(ticket.pubkey, ticket.price / web3.LAMPORTS_PER_SOL)}>
            Click to pay
          </button>
          <button onClick={() => withdraw(ticket.pubkey)}>
            Click to whithdraw
          </button>
          <br/>
        </>
      ))}
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
