import { useMemo } from "react";
import { Button, Col, Input, Row, Space } from "antd";
import RemoveFiltersButton from "./RemoveFiltersButton";
import AdministrationDropdown from "./AdministrationDropdown";
import { store, uiText } from "../../lib";
import { Link } from "react-router-dom";
import debounce from "lodash.debounce";
import {
  PlusOutlined,
  DownloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";

const { Search } = Input;

const AdministrationFilters = ({
  loading,
  onSearchChange = () => {},
  addLink = "/control-center/master-data/add-administration",
}) => {
  const authUser = store.useState((s) => s.user);
  const language = store.useState((s) => s.language);
  const { active: activeLang } = language;
  const text = useMemo(() => {
    return uiText[activeLang];
  }, [activeLang]);

  const handleChange = debounce(onSearchChange, 300);

  return (
    <Row>
      <Col flex={1}>
        <Space>
          <Search
            placeholder={text.searchNameOrCode}
            onChange={({ target }) => handleChange(target.value)}
            onSearch={(value) => onSearchChange(value)}
            style={{ width: 240 }}
            allowClear
          />
          <AdministrationDropdown loading={loading} />
          <RemoveFiltersButton
            extra={(s) => {
              s.filters = { trained: null, role: null, organisation: null };
            }}
          />
        </Space>
      </Col>
      {["Super Admin"].includes(authUser?.role?.value) && (
        <Col>
          <Space>
            <Link to="/control-center/data/upload-administration-data">
              <Button icon={<UploadOutlined />} shape="round">
                {text.bulkUploadButton}
              </Button>
            </Link>
            <Button icon={<DownloadOutlined />} shape="round">
              {text.exportButton}
            </Button>
            <Link to={addLink}>
              <Button type="primary" icon={<PlusOutlined />} shape="round">
                {text.addNewButton}
              </Button>
            </Link>
          </Space>
        </Col>
      )}
    </Row>
  );
};
export default AdministrationFilters;
