import { ReactElement, ReactNode } from "react";

import { Flex, Alert, AlertVariations } from "@aws-amplify/ui-react";
import ReactLoading from "react-loading";

interface ApiResultAlertProps {
  apiState: "waiting" | "none" | "success" | "error";
  success: ReactNode;
  error?: ReactNode;
  none?: ReactNode;
  waiting?: ReactNode;
}

export default function ApiResultAlert(
  props: ApiResultAlertProps
): ReactElement {
  let variation: AlertVariations;
  let node: ReactNode;
  if (props.apiState === "waiting") {
    return props.waiting ? (
      <Flex direction="row">
        <ReactLoading type="spin" color="black" height="40px" width="40px" />
        {props.waiting}
      </Flex>
    ) : (
      <ReactLoading type="spin" color="black" height="40px" width="40px" />
    );
  }

  if (props.apiState === "success") {
    variation = "success";
    node = props.success;
  } else if (props.apiState === "error") {
    variation = "error";
    node = props.error;
  } else {
    variation = "info";
    node = props.none;
  }
  return node ? (
    <Alert variation={variation} rowGap={1}>
      {node}
    </Alert>
  ) : (
    <div />
  );
}

ApiResultAlert.defaultProps = {
  none: undefined,
  waiting: undefined,
  error: undefined,
};
