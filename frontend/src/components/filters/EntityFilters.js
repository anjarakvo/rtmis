import { Button, Col, Input, Row, Space } from "antd";
import RemoveFiltersButton from "./RemoveFiltersButton";
import AdministrationDropdown from "./AdministrationDropdown";
import { store } from "../../lib";
import { Link } from "react-router-dom";
import {
  PlusOutlined,
  DownloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";

const { Search } = Input;

const EntityFilters = ({ loading }) => {
  const authUser = store.useState((s) => s.user);

  return (
    <Row>
      <Col flex={1}>
        <Space>
          <Search
            placeholder="Enter name..."
            // value={query}
            // onChange={(e) => {
            //   setQuery(e.target.value);
            // }}
            // onSearch={(e) => {
            //   fetchData(e);
            // }}
            style={{ width: 240 }}
            // loading={loading && !!query}
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
            <Link to="/data/upload">
              <Button icon={<UploadOutlined />} shape="round">
                Bulk Upload
              </Button>
            </Link>
            <Button icon={<DownloadOutlined />} shape="round">
              Export
            </Button>
            <Link to="/master-data/entities/add">
              <Button type="primary" icon={<PlusOutlined />} shape="round">
                Add New
              </Button>
            </Link>
          </Space>
        </Col>
      )}
    </Row>
  );
};
export default EntityFilters;