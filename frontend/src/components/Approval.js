import { Button } from "semantic-ui-react";

export default function Approval(props) {
    let sanitizedValue = parseFloat(
        props.depositAmt * `1e${props.token.assetObject.tDecimals}`
    );
    return (
        <div
            style={{
            display: "flex",
            flexDirection: "row",
            marginTop: "30px",
            marginBottom: "40px",
            justifyContent: "center",
          }}
        >
            <Button
                onClick={() => {
                    props.token.approveAsset(sanitizedValue, props.acct)
                }}
            >
                Approve {props.depositAmt}
            </Button>
            <Button
                onClick={() => {
                    props.token.approveAsset(2^256 - 1, props.acct);
                }}
            >
                Infinite Approval
            </Button>
        </div>
        
    );
}