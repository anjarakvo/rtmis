import React, { useEffect } from "react";
import "./style.scss";
import { Select, Space } from "antd";
import { useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { store, config } from "../../lib";

const AdministrationDropdown = ({
  loading = false,
  withLabel = false,
  width = 160,
  persist = false,
  hidden = false,
  maxLevel = null,
  allowMultiple = false,
  currentId = null,
  onChange,
  ...props
}) => {
  const { pathname } = useLocation();
  const { user, administration, isLoggedIn, levels } = store.useState(
    (state) => state
  );
  /**
   * Get lowest level administrator from maxLevel.
   * otherwise, sort asc by level and get the last item from levels global state
   */
  const lowestLevel = maxLevel
    ? levels.find((l) => l?.id === maxLevel)
    : levels
        .slice()
        .sort((a, b) => a.level - b.level)
        .slice(-1)?.[0];

  const public_state = config.allowedGlobal
    .map((x) => pathname.includes(x))
    .filter((x) => x)?.length;

  useEffect(() => {
    if (isLoggedIn && !persist && !public_state) {
      store.update((s) => {
        s.administration = [config.fn.administration(user.administration.id)];
      });
    }
  }, [user, isLoggedIn, persist, public_state]);

  const handleChange = (e, index) => {
    if (!e) {
      return;
    }
    store.update((s) => {
      s.administration.length = index + 1;
      const findAdm = config.fn.administration(e);
      const admItems = Array.isArray(findAdm) ? findAdm : [findAdm];
      s.administration = [...s.administration, ...admItems];
    });
    if (onChange) {
      const _values = allowMultiple && Array.isArray(e) ? e : null;
      onChange(_values);
    }
  };

  const handleClear = (index) => {
    store.update((s) => {
      s.administration.length = index + 1;
    });
  };

  if (administration && !hidden) {
    return (
      <Space {...props} style={{ width: "100%" }}>
        {administration
          .filter(
            (x) =>
              (x.children.length && !maxLevel) ||
              (maxLevel && x.level < maxLevel - 1 && x.children.length) // show children based on maxLevel
          )
          .map((region, regionIdx) => {
            if (maxLevel === null || regionIdx + 1 < maxLevel) {
              /**
               * Find last item by checking:
               * - regionIdx + 1 = next index is equal with parent maxLevel
               * OR
               * - region.level = current level is equal with parent lowest level
               */
              const isLastItem =
                (maxLevel && maxLevel - 1 === regionIdx + 1) ||
                region.level === lowestLevel?.level - 1;
              const selectMode =
                allowMultiple && isLastItem ? "multiple" : null;
              const selectValues =
                selectMode === "multiple"
                  ? administration
                      ?.slice(regionIdx + 1, administration.length)
                      ?.map((a) => a?.id)
                  : administration[regionIdx + 1]?.id || null;
              return (
                <div key={regionIdx}>
                  {withLabel ? (
                    <label className="ant-form-item-label">
                      {region?.childLevelName}
                    </label>
                  ) : (
                    ""
                  )}
                  <Select
                    placeholder={`Select ${region?.childLevelName || ""}`}
                    style={{ width: width }}
                    onChange={(e) => {
                      handleChange(e, regionIdx);
                    }}
                    onClear={() => {
                      handleClear(regionIdx);
                    }}
                    getPopupContainer={(trigger) => trigger.parentNode}
                    dropdownMatchSelectWidth={false}
                    value={selectValues}
                    disabled={loading}
                    allowClear
                    showSearch
                    filterOption={true}
                    optionFilterProp="children"
                    mode={selectMode}
                    className="custom-select"
                  >
                    {region.children
                      .filter(
                        (c) => !currentId || c?.id !== parseInt(currentId, 10)
                      ) // prevents circular loops when primary ID has the same parent ID
                      .map((optionValue, optionIdx) => (
                        <Select.Option key={optionIdx} value={optionValue.id}>
                          {optionValue.name}
                        </Select.Option>
                      ))}
                  </Select>
                </div>
              );
            }
          })}
      </Space>
    );
  }
  return "";
};

AdministrationDropdown.propTypes = {
  loading: PropTypes.bool,
  persist: PropTypes.bool,
  hidden: PropTypes.bool,
  maxLevel: PropTypes.number,
  allowMultiple: PropTypes.bool,
  onChange: PropTypes.func,
};

export default React.memo(AdministrationDropdown);
