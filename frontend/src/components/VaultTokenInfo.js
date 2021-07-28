import { useState } from "react";
import StatusMessage from "./StatusMessage";
import { nwConfig, currentChain } from "./NetworkConfig";

import {
  Header,
  Button,
  Grid,
  Divider,
  Icon,
  Segment,
  Form,
  Popup,
  Label,
  Accordion,
} from "semantic-ui-react";
import { web3 } from "./Web3Handler";
import WethWrap from "./WethWrap";
import Withdraw from "./Withdraw";
import Deposit from "./Deposit";
import styled from "styled-components";

const DWIndicator = styled.div`
  display: flex;
  flex-direction: row;
  width: 80%;
  height: 60px;

  margin-left: auto;
  margin-right: auto;
`;
const DIndicator = styled.div`
  padding-top: 17px;
  border-radius: 0px 20px 0 0;
  background-color: #146ca4;
  width: 50%;
  text-align: center;
  cursor: pointer;
  &:hover {
    background-color: purple;
  }
`;
const WIndicator = styled.div`
  padding-top: 17px;
  cursor: pointer;
  border-radius: 20px 0px 0 0;
  background-color: #146ca4;
  width: 50%;
  text-align: center;
  &:hover {
    background-color: purple;
  }
`;

const DWForm = styled.div`
  width: 80%;
  margin-left: auto;
  margin-right: auto;
  border-radius: 0 0 20px 20px;
  border-top: 2px solid black;
  background-color: #146ca4;
  padding-bottom: 50px;
`;
export default function VaultTokenInfo(props) {
  const [depositAmt, setDeposit] = useState(0);
  const [withdrawAmt, setWithdrawAmt] = useState(0);
  const [initializeAmt, setInitializeAmt] = useState(0);

  const [oTokenAddress, setOTokenaddress] = useState("");
  const [writeCallAmt, setWriteCallAmt] = useState(0);
  const [sellCallAmt, setSellCallAmt] = useState(0);
  const [premiumAmount, setPemiumAmount] = useState(0);
  const [otherPartyAddress, setOtherPartyAddress] = useState(0);
  const [showWriteCall, setShowWriteCall] = useState(false);
  const [showSellCall, setShowSellCall] = useState(false);
  const [writeColor, setWriteColor] = useState("teal");
  const [sellColor, setSellColor] = useState("teal");
  const [settleColor, setSettleColor] = useState("teal");

  const [statusMessage, setStatusMessage] = useState("");
  const [showStatus, setShowStatus] = useState(false);
  const [statusHeader, setStatusHeader] = useState("");
  const [statusError, setStatusError] = useState(false);
  const [txSent, setTxSent] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [iconStatus, setIconStatus] = useState("loading");
  const [btnDisabled, setBtnDisabled] = useState(false);
  const [managerClick, setManagerClick] = useState(false);

  //=======texting for eth to weth
  const [eToWethAmt, setEToWethAmt] = useState(0);
  const [showConvertForm, setShowConvertForm] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showD, setShowD] = useState(false);
  const [showW, setShowW] = useState(true);

  function ethInputAmt(event) {
    if (event.target.value > props.ethBal) {
      setSM("Error", "Not enough ether", true, true);
      setIconStatus("error");
      return;
    }
    setEToWethAmt(event.target.value);
  }

  function ethToWeth(a) {
    if (a === 0) {
      setSM("Error", "Form input Error", true, true);
      setIconStatus("error");
      return;
    }
    let amount = web3.utils.toWei(a, "ether");
    let e = web3.eth.sendTransaction({
      from: props.acct,
      to: nwConfig[currentChain].wethContractAddr,
      value: amount,
    });
    sendTX(e, "Converting to WETH");
  }

  //========ending
  function setSM(h, m, s, e) {
    setStatusHeader(h);
    setStatusMessage(m);
    setShowStatus(s);
    setStatusError(e);
  }

  function sendTX(c, label) {
    // eval[c]
    c
      // .on("receipt", function (receipt) {
      //   console.log(receipt);
      //   setSM("TX Receipt Received", "", true, false);
      // })
      .on("transactionHash", function (hash) {
        setTxHash(hash);
        setSM("TX Hash Received", hash, true, false);
      })
      .on("error", function (error, receipt) {
        let m = "";
        if (error !== null) {
          let i = error.message.indexOf(":");
          m = error.message.substring(0, i > 0 ? i : 40);
        }
        setSM(label + " TX Error", m, true, true);
        setTxSent(false);
        setIconStatus("error");
      })
      .on("confirmation", function (confirmationNumber, receipt) {
        setSM(
          label + " TX Confirmed",
          confirmationNumber + " Confirmation Received",
          true,
          false
        );
        setIconStatus("confirmed");
      });
  }

  function overAmount(a, b, c) {
    c = c * 1e18;
    if (a > b + c) {
      setSM("Error", "You don't have enough balance", true, true);
      setIconStatus("error");
      return;
    } else if (a > b && a < b + c) {
      setSM(
        "Error",
        `You need to convert ${(a - b) / 1e18} ETH to WETH`,
        true,
        true
      );
      setIconStatus("error");
      setShowConvertForm(true);
      return;
    }
  }

  function deposit(amt) {
    console.log(props);
    startTX();
    if (amt === 0 || isNaN(amt)) {
      setSM("Error", "Form input Error", true, true);
      setIconStatus("error");
      return;
    }
    // let amount = web3.utils.toWei(amt, dUnit);
    let amount = web3.utils.toWei(amt, "ether");
    props.token
      .approveAsset(amount, props.acct)
      .on("transactionHash", function (hash) {
        setTxHash(hash);
        setSM("TX Hash Received", hash, true, false);
      })
      .on("error", function (error, receipt) {
        let m = "";
        if (error !== null) {
          let i = error.message.indexOf(":");
          m = error.message.substring(0, i > 0 ? i : 40);
        }
        setSM("" + " TX Error", m, true, true);
        setTxSent(false);
        setIconStatus("error");
      })
      .on("confirmation", function (confirmationNumber, receipt) {
        if (confirmationNumber === 1) {
          let i = props.token.deposit(amount, props.acct);
          sendTX(i, "deposit");
          setSM("Approval TX Confirmed", "Confirmation Received", true, false);

          setIconStatus("confirmed");
        }
      });
  }

  function initialize(amt) {
    startTX();
    if (amt === 0 || isNaN(amt)) {
      setSM("Error", "Form input Error", true, true);
      setIconStatus("error");

      return;
    }
    let amount = web3.utils.toWei(amt, "ether");
    props.token
      .approveAsset(amount, props.acct)
      .on("transactionHash", function (hash) {
        setTxHash(hash);
        setSM("TX Hash Received", hash, true, false);
      })
      .on("error", function (error, receipt) {
        let m = "";
        if (error !== null) {
          let i = error.message.indexOf(":");
          m = error.message.substring(0, i > 0 ? i : 40);
        }
        setSM(" TX Error", m, true, true);
        setTxSent(false);
        setIconStatus("error");
      })
      .on("confirmation", function (confirmationNumber, receipt) {
        if (confirmationNumber === 1) {
          let i = props.token.initialize(amount, props.acct);
          sendTX(i, "initialize");
          setSM("Approval TX Confirmed", " Confirmation Received", true, false);

          setIconStatus("confirmed");
        }
      });
  }

  function withDraw(amt) {
    startTX();

    if (amt === 0 || isNaN(amt)) {
      setSM("Error", "Form input Error", true, true);
      setIconStatus("error");
      return;
    }

    // let amount = web3.utils.toWei(amt, wUnit);
    let amount = web3.utils.toWei(amt, "ether");
    let w = props.token.withdraw(amount, props.acct);
    sendTX(w, "Withdraw");
  }

  function settleVault() {
    startTX();
    let s = props.token.settleVault(props.acct);
    sendTX(s, "Settle Vault");
  }

  function writeCall(amt, oTAddress) {
    startTX();
    //  let amount = web3.utils.toWei(amt, writeCallUnit);
    let amount = web3.utils.toWei(amt, "ether");
    let wc = props.token.writeCalls(
      amount,
      oTAddress,
      props.mpAddress,
      props.acct
    );
    sendTX(wc, "Write Call");
  }

  function sellCall(amt, premiumAmount, otherPartyAddress) {
    //let amount = web3.utils.toWei(amt, sellCallUnit);
    let amount = parseInt(amt) * (1e8).toString();
    // let pAmount = web3.utils.toWei(premiumAmount, pemiumUnit);
    let pAmount = web3.utils.toWei(premiumAmount, "ether");
    let sc = props.token.sellCalls(
      amount,
      pAmount,
      otherPartyAddress,
      props.acct
    );
    sendTX(sc, "Sell Call");
  }

  function confirmWriteCall(e) {
    startTX();
    e.preventDefault();
    if (writeCallAmt === 0 || oTokenAddress === "") {
      setSM("Error", "Form input Error", true, true);
      setIconStatus("error");

      return;
    }

    writeCall(writeCallAmt, oTokenAddress);
  }

  function confirmSellCall(e) {
    startTX();
    e.preventDefault();
    if (sellCallAmt === 0 || premiumAmount === 0 || otherPartyAddress === "") {
      setSM("Error", "Form input Error", true, true);
      setIconStatus("error");

      return;
    }

    sellCall(sellCallAmt, premiumAmount, otherPartyAddress);
  }

  function startTX() {
    setBtnDisabled(true);
    setSM("MetaMask", "Sending Transaction", true, false);
    setTxSent(true);
  }

  // function disableAllInput() {}
  function resetForm() {
    setBtnDisabled(false);
    setIconStatus("loading");
    setShowStatus(false);
  }

  function handleConvert(e, titleProps) {
    const { index } = titleProps;
    const newIndex = activeIndex === index ? -1 : index;

    setActiveIndex(newIndex);
  }

  function convertForm() {
    return (
      <div>
        <Accordion>
          <Accordion.Title
            active={activeIndex === 0}
            index={0}
            onClick={handleConvert}
          >
            <Icon name="dropdown" />
            ETH <Icon name="long arrow alternate right" /> WETH Wrapper
          </Accordion.Title>
          {/* {showConvertModal && ( */}
          <Accordion.Content active={activeIndex === 0}>
            <p>
              <WethWrap
                acct={props.acct}
                ethInputAmt={ethInputAmt}
                ethToWeth={() => ethToWeth(eToWethAmt)}
                eToWethAmt={eToWethAmt}
              />
              {/* )} */}
            </p>
            <Divider section />
          </Accordion.Content>
        </Accordion>
      </div>
    );
  }

  function writeCallRender() {
    return (
      <Form>
        <Divider hidden />

        <Form.Group>
          <Form.Field>
            <label>Write Call Amount</label>
            <input
              value={writeCallAmt}
              // onChange={(e) => setWriteCallAmt(e.target.value)}
              onChange={(e) => {
                if (e.target.value > 0) {
                  let a = web3.utils.toWei(e.target.value, "ether");
                  overAmount(
                    a,
                    props.token.assetObject.myBalance,
                    props.ethBal
                  );
                  setWriteCallAmt(e.target.value);
                } else {
                  setWriteCallAmt(e.target.value);
                }
              }}
            />
          </Form.Field>
          <div style={{ marginTop: "35px", paddingLeft: "0px" }}>
            {props.token.assetObject.tSymbol}
          </div>
          {/* <label>select</label>
            <Menu compact size="tiny">
              <Dropdown
                defaultValue="ether"
                options={units}
                item
                onChange={updateWriteCallUnit}
              />
            </Menu> */}
        </Form.Group>

        <Form.Field>
          <label>oToken Address</label>
          <input
            value={oTokenAddress}
            onChange={(e) => setOTokenaddress(e.target.value)}
          />
        </Form.Field>
        <Form.Field>
          <label>Margin Pool Address</label>
          <input placeholder={props.mpAddress} value={props.mpAddress} />
        </Form.Field>

        <Button color="teal" onClick={confirmWriteCall} disabled={btnDisabled}>
          Confirm
        </Button>
        <Button
          onClick={() => {
            setShowWriteCall(false);
            setSM("", "", false, false);
            setTxHash("");
            setTxSent(false);
            setSellColor("teal");
            setSettleColor("teal");
            setManagerClick(false);
          }}
          disabled={btnDisabled}
        >
          Cancel
        </Button>
      </Form>
    );
  }

  // vault tokens / (asset tokens + collateral amount)
  //props.token.assetObject
  function showRatio() {
    // let vtBN = new BigNumber(props.token.totalSupply);
    // let atBN = new BigNumber(props.token.vaultBalance);

    // let denominator = atBN.plus(props.token.collateralAmount);

    // let pairRatio = parseInt(vtBN.dividedBy(denominator).toString());
    return (
      <Grid textAlign="center" stackable>
        <Grid.Column>
          <Header size="large" color="blue">
            1 WETH ={" "}
            {Number(props.token.totalSupply) /
              (Number(props.token.vaultBalance) +
                Number(props.token.collateralAmount))}{" "}
            Vault Tokens
            {/* {pairRatio} */}
          </Header>
          {/* <Header.Subheader># vault tokens/ vault assets</Header.Subheader> */}
          <Header.Subheader>
            Vault Tokens / (Asset Tokens + Collateral Amount)
          </Header.Subheader>
        </Grid.Column>
      </Grid>
    );
  }

  function showInitialize() {
    return (
      <div>
        <Divider />
        <Divider hidden />
        <Grid textAlign="center">
          <Form>
            <Form.Group>
              <Form.Field>
                <input
                  value={initializeAmt}
                  // onChange={(e) => setInitializeAmt(e.target.value)}
                  onChange={(e) => {
                    if (e.target.value > 0) {
                      let a = web3.utils.toWei(e.target.value, "ether");
                      overAmount(
                        a,
                        props.token.assetObject.myBalance,
                        props.ethBal
                      );
                      setInitializeAmt(e.target.value);
                    } else {
                      setInitializeAmt(e.target.value);
                    }
                  }}
                />
              </Form.Field>
              <div style={{ marginTop: "10px", marginRight: "20px" }}>
                {props.token.assetObject.symbol()}
              </div>
              {/* <Menu compact size="tiny">
                <Dropdown
                  // defaultValue="wei"
                  defaultValue="ether"
                  options={units}
                  item
                  onChange={updateIUnit}
                />
              </Menu> */}

              <Button
                onClick={() => initialize(initializeAmt)}
                color="teal"
                disabled={btnDisabled}
              >
                Initialize
              </Button>
            </Form.Group>
          </Form>
        </Grid>
      </div>
    );
  }

  function renderSellCall() {
    return (
      <Form>
        <Divider hidden />
        <Form.Group>
          <Form.Field>
            <label>Amount</label>
            <input
              value={sellCallAmt}
              onChange={(e) => setSellCallAmt(e.target.value)}
            />
          </Form.Field>
          <div style={{ paddingTop: "35px" }}>oToken</div>
          {/* <Form.Field>
            <label>select</label>
            <Menu compact size="tiny">
              <Dropdown
                defaultValue="ether"
                options={units}
                item
                onChange={updateSellCallUnit}
              />
            </Menu>
          </Form.Field> */}
        </Form.Group>
        <Form.Group>
          <Form.Field>
            <label>Premium Amount</label>
            <input
              value={premiumAmount}
              // onChange={(e) => setPemiumAmount(e.target.value)}
              onChange={(e) => {
                if (e.target.value > 0) {
                  let a = web3.utils.toWei(e.target.value, "ether");
                  overAmount(
                    a,
                    props.token.assetObject.myBalance,
                    props.ethBal
                  );
                  setPemiumAmount(e.target.value);
                } else {
                  setPemiumAmount(e.target.value);
                }
              }}
            />
          </Form.Field>
          <div style={{ paddingTop: "35px" }}>
            {props.token.assetObject.tSymbol}
          </div>
          {/* <Form.Field>
            <label>select</label>
            <Menu compact size="tiny">
              <Dropdown
                defaultValue="ether"
                options={units}
                item
                onChange={updatePremiumUnit}
              />
            </Menu>
          </Form.Field> */}
        </Form.Group>
        <Form.Field>
          <label>Other party address</label>
          <input
            placeholder="Other party address"
            onChange={(e) => setOtherPartyAddress(e.target.value)}
          />
        </Form.Field>
        <Button color="teal" onClick={confirmSellCall} disabled={btnDisabled}>
          Confirm
        </Button>
        <Button
          onClick={() => {
            setShowSellCall(false);
            setWriteColor("teal");
            setSettleColor("teal");
            setManagerClick(false);
          }}
          disabled={btnDisabled}
        >
          Cancel
        </Button>
      </Form>
    );
  }

  function managerMenu() {
    return (
      <div>
        <Divider />
        <Divider hidden />
        <Divider hidden />
        <Grid centered>
          <Header>Manage</Header>
        </Grid>
        <Grid centered columns={3} textAlign="center" relaxed>
          <Grid.Row>
            <Grid.Column stretched>
              <Button
                labelPosition="right"
                icon
                color={writeColor}
                onClick={() => {
                  setShowWriteCall(true);
                  setWriteColor("teal");
                  setShowSellCall(false);
                  setSellColor("grey");
                  setSettleColor("grey");
                  setManagerClick(true);
                }}
                disabled={btnDisabled}
              >
                Write Call
                <Icon name="triangle down" />
              </Button>
            </Grid.Column>
            <Grid.Column stretched>
              <Button
                color={sellColor}
                labelPosition="right"
                icon
                onClick={() => {
                  setShowSellCall(true);
                  setShowWriteCall(false);
                  setSellColor("teal");
                  setWriteColor("grey");
                  setSettleColor("grey");
                  setManagerClick(true);
                }}
                disabled={btnDisabled}
              >
                Sell Call
                <Icon name="triangle down" />
              </Button>
            </Grid.Column>
            <Grid.Column stretched>
              <Button
                color={settleColor}
                onClick={settleVault}
                disabled={btnDisabled}
              >
                Settle Vault
              </Button>
            </Grid.Column>
          </Grid.Row>
        </Grid>
        {showWriteCall && writeCallRender()}
        {showSellCall && renderSellCall()}
      </div>
    );
  }
  function updateWDAmt(e) {
    setWithdrawAmt(e.target.value);
  }

  function updateDAmt(e) {
    if (e.target.value > 0) {
      let a = web3.utils.toWei(e.target.value, "ether");
      overAmount(a, props.token.assetObject.myBalance, props.ethBal);
      setDeposit(e.target.value);
    } else {
      setDeposit(e.target.value);
    }
  }
  function clickShowD() {
    console.log("click d");
    setShowD(true);
    setShowW(false);
  }
  function clickShowW() {
    console.log("click w");
    setShowD(false);
    setShowW(true);
  }
  function showTokenPair() {
    return (
      <>
        <DWIndicator>
          <WIndicator onClick={() => clickShowW()}> Widthdraw </WIndicator>
          <DIndicator onClick={() => clickShowD()}>Deposit</DIndicator>
        </DWIndicator>
        {!showD ? (
          <DWForm>
            <Withdraw
              token={props.token}
              withDraw={withDraw}
              withdrawAmt={withdrawAmt}
              updateWDAmt={updateWDAmt}
              managerClick={managerClick}
              btnDisabled={btnDisabled}
            />
          </DWForm>
        ) : (
          <DWForm>
            <Deposit
              token={props.token}
              deposit={deposit}
              depositAmt={depositAmt}
              updateDAmt={updateDAmt}
              managerClick={managerClick}
              btnDisabled={btnDisabled}
            />
          </DWForm>
        )}
      </>
    );
  }

  return (
    <div>
      {showStatus && (
        <Grid>
          <Grid.Column width={14}>
            <StatusMessage
              statusHeader={statusHeader}
              statusMessage={statusMessage}
              statusError={statusError}
              txHash={txHash}
              iconStatus={iconStatus}
            />
          </Grid.Column>
          <Grid.Column width={2} verticalAlign="middle">
            {iconStatus !== "loading" && (
              <Button onClick={resetForm} icon="check" circular />
            )}
          </Grid.Column>
        </Grid>
      )}
      {/* {showConvertForm && convertForm()} */}
      <Divider hidden />
      {props.token.vaultBalance > 0 && showRatio()}
      <Divider hidden />
      {showTokenPair()}

      {props.token.totalSupply === 0 && showInitialize()}

      {props.token.manageToken && managerMenu()}
      <Divider hidden />
      {convertForm()}
    </div>
  );
}

//=====================================================

// function showTokenPair1() {
//   return (
//     <Segment basic>
//       <Grid stackable columns={2}>
//         <Grid.Column>
//           <Header color="grey" size="medium">
//             vault{" "}
//           </Header>

//           <Header size="huge" color="blue">
//             {props.token.tName}
//             {props.token.oTokenObj && props.token.oTokenObj.tName !== "" && (
//               <Popup
//                 content={props.token.oTokenObj.name()}
//                 trigger={
//                   <Label color="blue">
//                     <Icon name="star" />
//                     show oToken
//                   </Label>
//                 }
//               />
//             )}
//           </Header>

//           <Header size="medium">
//             My Balance: {props.token.myBalance / 1e18}
//           </Header>

//           {/* <Header>{props.token.symbol()}</Header> */}

//           <Header size="medium">
//             Total Supply: {props.token.totalSupply / 1e18}
//           </Header>
//           {/* {props.token.oTokenObj && props.token.oTokenObj.tName !== "" && (
//             <Header>oToken: {props.token.oTokenObj.name()}</Header>
//           )} */}
//           <Divider hidden />
//           {props.token.totalSupply > 0 && !managerClick && (
//             <Form>
//               <Form.Group>
//                 <Popup
//                   pinned
//                   trigger={
//                     <Icon
//                       name="info circle"
//                       color="blue"
//                       size="large"
//                       style={{ marginTop: "auto", marginBottom: "auto" }}
//                     />
//                   }
//                 >
//                   <Popup.Header>Withdraw</Popup.Header>
//                   <Popup.Content>
//                     When withdrawing, you will burn away your vault tokens to
//                     redeem the underlying asset token. Withdrawing from the
//                     vault can only be done if the vault's withdrawal window has
//                     opened up after the manager has settled the vault.
//                   </Popup.Content>
//                 </Popup>
//                 <Form.Field>
//                   <input
//                     value={withdrawAmt}
//                     onChange={(e) => setWithdrawAmt(e.target.value)}
//                   />
//                 </Form.Field>
//                 <div style={{ marginTop: "13px" }}> {props.token.tSymbol}</div>
//                 {/* <Menu compact size="tiny">
//                   <Dropdown
//                     defaultValue="ether"
//                     options={units}
//                     item
//                     onChange={updatewUnit}
//                   />
//                 </Menu> */}
//               </Form.Group>

//               <Button
//                 onClick={() => withDraw(withdrawAmt)}
//                 color="blue"
//                 icon
//                 size="large"
//                 labelPosition="right"
//                 disabled={btnDisabled}
//               >
//                 Withdraw
//                 <Icon name="arrow right" />
//               </Button>
//             </Form>
//           )}
//         </Grid.Column>
//         <Grid.Column textAlign="right">
//           <Header color="grey" size="medium">
//             asset{" "}
//           </Header>
//           <Header size="huge" color="orange">
//             {props.token.assetObject.tnName}
//             {/* {props.token.assetObject.symbol()} */}
//           </Header>

//           <Header size="medium">
//             My Balance: {props.token.assetObject.myBalance / 1e18}
//           </Header>

//           <Header size="medium">
//             Vault Balance: {props.token.vaultBalance / 1e18}
//           </Header>

//           <Divider hidden />
//           {props.token.totalSupply > 0 && !managerClick && (
//             <Form>
//               <div style={{ float: "right" }}>
//                 <Form.Group>
//                   <Popup
//                     pinned
//                     trigger={
//                       <Icon
//                         name="info circle"
//                         color="orange"
//                         size="large"
//                         style={{ marginTop: "auto", marginBottom: "auto" }}
//                       />
//                     }
//                   >
//                     <Popup.Header>Deposit</Popup.Header>
//                     <Popup.Content>
//                       When depositing, you will deposit the vault's asset token
//                       in redemption for vault tokens to represent your fair
//                       share of the vault. Depositing is open anytime whether the
//                       withdrawal window is closed or not.
//                     </Popup.Content>
//                   </Popup>
//                   <Form.Field>
//                     <input
//                       value={depositAmt}
//                       onChange={(e) => {
//                         console.log(typeof e.target.value);
//                         if (e.target.value > 0) {
//                           let a = web3.utils.toWei(e.target.value, "ether");
//                           overAmount(
//                             a,
//                             props.token.assetObject.myBalance,
//                             props.ethBal
//                           );
//                           setDeposit(e.target.value);
//                         } else {
//                           setDeposit(e.target.value);
//                         }
//                       }}
//                     />
//                   </Form.Field>
//                   <div style={{ paddingTop: "13px" }}>
//                     {props.token.assetObject.tSymbol}
//                   </div>

//                   {/* <Menu compact size="tiny">
//                   <Dropdown
//                     defaultValue="ether"
//                     options={units}
//                     item
//                     onChange={updatedUnit}
//                   />
//                 </Menu> */}
//                 </Form.Group>
//               </div>
//               {/* {showDepositErrormsg && <ErrorMessage />}
//               {showDepositSuccessmsg && <SuccessMessage />} */}

//               <Button
//                 onClick={() => {
//                   deposit(depositAmt);
//                 }}
//                 color="orange"
//                 icon
//                 size="large"
//                 labelPosition="left"
//                 disabled={
//                   props.token.totalSupply === 0 ||
//                   props.token.assetObject.myBalance === 0 ||
//                   btnDisabled
//                 }
//               >
//                 Deposit
//                 <Icon name="arrow left" />
//               </Button>
//             </Form>
//           )}
//           {/* <Header>Total Supply: {props.token.assetObject.totalSupply}</Header> */}
//         </Grid.Column>
//         {/* <Header>{props.token.symbol()}</Header> */}
//       </Grid>
//       <Divider vertical>
//         {/* <Icon name="sync" size="huge" color="teal" /> */}
//         And
//       </Divider>
//     </Segment>
//   );
// }
