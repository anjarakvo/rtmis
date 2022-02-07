import React, { useState } from "react";
import { Form, Input, Button, Checkbox, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { api, store } from "../../lib";
import { useNavigate } from "react-router-dom";

const checkBoxOptions = [
  { name: "Lowercase Character", re: /[a-z]/ },
  { name: "Numbers", re: /\d/ },
  { name: "Special Character", re: /[-._!"`'#%&,:;<>=@{}~$()*+/?[\]^|]/ },
];

const RegistrationForm = (props) => {
  const { invite } = props;
  const [checkedList, setCheckedList] = useState([]);
  const navigate = useNavigate();

  const onFinish = (values) => {
    const url = `v1/set/user/password/`;
    const postData = {
      invite,
      password: values.password,
      confirm_password: values.confirm,
    };
    api
      .post(url, postData)
      .then((res) => {
        api.setToken(res.data.token);
        const userData = {
          name: res.data.name,
          email: res.data.email,
          invite: res.data.invite,
        };
        store.update((s) => {
          s.isLoggedIn = true;
          s.user = userData;
        });
        message.success("Password updated successfully");
        navigate("/control-center");
      })
      .catch((err) => {
        console.error(err.response.data.message);
      });
  };

  const onChange = ({ target }) => {
    const criteria = checkBoxOptions
      .map((x) => {
        const available = x.re.test(target.value);
        return available ? x.name : false;
      })
      .filter((x) => x);
    setCheckedList(criteria);
  };

  return (
    <>
      <Checkbox.Group
        options={checkBoxOptions.map((x) => x.name)}
        value={checkedList}
      />
      <Form
        name="registration-form"
        layout="vertical"
        initialValues={{
          remember: true,
        }}
        onFinish={onFinish}
        onChange={onChange}
      >
        <Form.Item
          name="password"
          label="Password"
          rules={[
            {
              required: true,
              message: "Please input your Password!",
            },
            () => ({
              validator() {
                if (checkedList.length === 3) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("False Password Criteria"));
              },
            }),
          ]}
          hasFeedback
        >
          <Input.Password
            prefix={<UserOutlined className="site-form-item-icon" />}
            placeholder="Password"
          />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="Confirm Password"
          dependencies={["password"]}
          hasFeedback
          rules={[
            {
              required: true,
              message: "Please Confirm Password!",
            },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error("The two passwords that you entered do not match!")
                );
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="site-form-item-icon" />}
            placeholder="Confirm Password"
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Set New Password
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

export default RegistrationForm;
