import React, { useEffect, useState } from "react";
import { Button, DatePicker, Input, Select, Row, Col, Image } from "antd";
import { config } from "../lib";
import { isEqual } from "lodash";
const { Option } = Select;
import { UndoOutlined, SaveOutlined } from "@ant-design/icons";
import moment from "moment";
import PropTypes from "prop-types";

const EditableCell = ({
  record,
  parentId,
  updateCell,
  resetCell,
  pendingData,
  disabled = false,
  readonly = false,
  isPublic = false,
  resetButton = {},
  lastValue = false,
}) => {
  const [editing, setEditing] = useState(false);
  const [locationName, setLocationName] = useState(null);
  const [value, setValue] = useState(null);
  const [oldValue, setOldValue] = useState(null);

  useEffect(() => {
    if (
      record &&
      (record.newValue ||
        record.newValue === 0 ||
        record.value ||
        record.value === 0)
    ) {
      const newValue =
        record.newValue || record.newValue === 0
          ? record.newValue
          : record.value;

      setValue(
        record.type === "date"
          ? moment(newValue).format("YYYY-MM-DD")
          : record.type === "geo"
          ? newValue?.join(", ")
          : newValue
      );
      setOldValue(
        record.type === "date"
          ? moment(record.lastValue).format("YYYY-MM-DD")
          : record.type === "geo"
          ? record?.lastValue?.join(", ")
          : record.lastValue
      );
    }
  }, [record]);

  const notEditable =
    record.type === "cascade" ||
    record.type === "geo" ||
    record.type === "photo" ||
    readonly;
  const edited =
    record &&
    (record.newValue || record.newValue === 0) &&
    !isEqual(record.value, record.newValue);

  useEffect(() => {
    if (
      record &&
      record.type === "cascade" &&
      !record?.api &&
      !locationName &&
      !lastValue
    ) {
      /**
       * TODO: Handle recognizing entity cascade clearly
       */
      if (typeof record.value === "string") {
        setLocationName(record.value);
      } else {
        if (record.value) {
          config.fn.administration(record.value, false).then((res) => {
            const locName = res;
            setLocationName(locName?.full_name);
          });
        } else {
          setLocationName(null);
        }
      }
    }
    if (
      record &&
      record.type === "cascade" &&
      !record?.api &&
      !locationName &&
      lastValue
    ) {
      /**
       * TODO: Handle recognizing entity cascade clearly
       */
      if (typeof record.lastValue === "string") {
        setLocationName(record.lastValue);
      } else {
        if (record.lastValue) {
          config.fn.administration(record.lastValue, false).then((res) => {
            const locName = res;
            setLocationName(locName?.full_name);
          });
        } else {
          setLocationName("-");
        }
      }
    }
  }, [record, locationName, lastValue]);

  const getAnswerValue = () => {
    switch (record.type) {
      case "date":
        return value ? moment(value).format("YYYY-MM-DD") : "-";
      case "multiple_option":
        return value?.length
          ? value
              ?.map((v) => {
                const option = record?.option?.find((o) => o.value === v);
                return option?.label;
              })
              ?.join(", ") || "-"
          : "-";
      case "option":
        return value?.length
          ? record?.option?.find((o) => o.value === value[0])?.label || "-"
          : "-";
      default:
        return value || value === 0 ? value : "-";
    }
  };

  const getLastAnswerValue = () => {
    switch (record.type) {
      case "multiple_option":
        return oldValue?.length
          ? oldValue
              ?.map((v) => {
                const option = record?.option?.find((o) => o.value === v);
                return option?.label;
              })
              ?.join(", ") || "-"
          : "-";
      case "option":
        return oldValue?.length
          ? record?.option?.find((o) => o.value === oldValue[0])?.label || "-"
          : "-";
      default:
        return oldValue || oldValue === 0 ? oldValue : "-";
    }
  };

  const renderAnswerInput = () => {
    return record.type === "option" ? (
      <Select
        style={{ width: "100%" }}
        value={value?.length ? value[0] : null}
        onChange={(e) => {
          setValue([e]);
        }}
        disabled={disabled}
      >
        {record.option.map((o) => (
          <Option key={o.id} value={o?.value} title={o?.label}>
            {o?.label}
          </Option>
        ))}
      </Select>
    ) : record.type === "multiple_option" ? (
      <Select
        mode="multiple"
        style={{ width: "100%" }}
        value={value?.length ? value : null}
        onChange={(e) => {
          setValue(e);
        }}
        disabled={disabled}
      >
        {record.option.map((o) => (
          <Option key={o.id} value={o?.value} title={o?.label}>
            {o?.label}
          </Option>
        ))}
      </Select>
    ) : record.type === "date" ? (
      <DatePicker
        size="small"
        value={moment(value)}
        format="YYYY-MM-DD"
        animation={false}
        onChange={(d, ds) => {
          if (d) {
            setValue(ds);
          }
        }}
        disabled={disabled}
      />
    ) : (
      <Input
        autoFocus
        type={record.type === "number" ? "number" : "text"}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        onPressEnter={() => {
          updateCell(record.id, parentId, value);
          setEditing(false);
        }}
        disabled={disabled}
      />
    );
  };

  return editing ? (
    <Row direction="horizontal">
      <Col flex={1}>{renderAnswerInput()}</Col>
      <Button
        type="primary"
        shape="round"
        onClick={() => {
          updateCell(record.id, parentId, value);
          setEditing(false);
        }}
        icon={<SaveOutlined />}
        style={{ marginRight: "8px" }}
      >
        Save
      </Button>
      <Button
        danger
        shape="round"
        onClick={() => {
          setEditing(false);
        }}
      >
        Close
      </Button>
    </Row>
  ) : (
    <Row>
      <Col
        flex={1}
        style={{
          cursor: !notEditable && !pendingData ? "pointer" : "not-allowed",
        }}
        onClick={() => {
          if (!notEditable && !pendingData && !isPublic) {
            setEditing(!editing);
          }
        }}
      >
        <span className={lastValue ? null : "blue"}>
          {record.type === "cascade" && !record?.api ? (
            locationName
          ) : record.type === "photo" && value && !lastValue ? (
            <Image src={value} width={100} />
          ) : record.type === "photo" && lastValue && oldValue ? (
            <Image src={oldValue} width={100} />
          ) : lastValue ? (
            getLastAnswerValue()
          ) : (
            getAnswerValue()
          )}
        </span>
      </Col>
      {edited && resetButton[record.id] && (
        <Button
          shape="round"
          onClick={() => {
            resetCell(record.id, parentId);
          }}
          icon={<UndoOutlined />}
        >
          Reset
        </Button>
      )}
    </Row>
  );
};

EditableCell.propTypes = {
  record: PropTypes.shape({
    id: PropTypes.number.isRequired,
    type: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.any, PropTypes.oneOf([null])]),
    option: PropTypes.array,
    newValue: PropTypes.any,
  }),
  parentId: PropTypes.number.isRequired,
  updateCell: PropTypes.func,
  resetCell: PropTypes.func,
  pendingData: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  disabled: PropTypes.bool,
  readonly: PropTypes.bool,
};
export default React.memo(EditableCell);
