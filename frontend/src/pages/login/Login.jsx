import React, { useEffect, useState, useMemo } from "react";
import "./style.scss";
import { Row, Col, Spin } from "antd";
import { LoginForm, RegistrationForm, ResetForm } from "./components";
import { ContactForm } from "../../components";
import { useParams } from "react-router-dom";
import { api, store, uiText } from "../../lib";

const styles = {
  side: {
    backgroundImage: `url("/assets/dot-pattern.svg")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  },
};

const ContactUsText = () => (
  <p className="contact-text">
    Having trouble accessing the platform? Please{" "}
    <a
      href="#"
      onClick={() => {
        store.update((s) => {
          s.showContactFormModal = true;
        });
      }}
    >
      contact
    </a>
    .
  </p>
);

const Login = () => {
  const { invitationId } = useParams();
  const [invitedUser, setInvitedUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const { language } = store.useState((s) => s);
  const { active: activeLang } = language;
  const text = useMemo(() => {
    return uiText[activeLang];
  }, [activeLang]);

  useEffect(() => {
    if (!location.pathname.includes("forgot-password") && invitationId) {
      setLoading(true);
      api
        .get(`invitation/${invitationId}`)
        .then((res) => {
          setInvitedUser({
            name: res.data.name,
            invite: invitationId,
          });
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [invitationId]);

  return (
    <div id="login">
      <div className="background" style={styles.side} />
      <Row className="wrapper" align="middle">
        <Col span={24} className="right-side">
          {location.pathname.includes("forgot-password") ? (
            <>
              <h1>
                {text.forgotTitle}
                <br />
                <small>{text.forgotDesc}</small>
              </h1>
              <br />
              <ContactUsText />
              <ResetForm />
            </>
          ) : (
            <>
              {loading ? (
                <div>
                  <Spin />
                  <h2>
                    Verifying
                    <br />
                    <small>Please wait..</small>
                  </h2>
                </div>
              ) : (
                <>
                  {invitationId ? (
                    <div>
                      {invitedUser ? (
                        // TODO
                        <>
                          <h1 data-testid="welcome-title">
                            {text.welcomeShort}, {invitedUser.name}
                            <br />
                            <small>{text.resetHint}</small>
                          </h1>
                          <RegistrationForm invite={invitedUser.invite} />
                        </>
                      ) : (
                        <div>
                          <h1>
                            {text.invalidInviteTitle}
                            <br />
                            <small>{text.invalidInviteDesc}</small>
                          </h1>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <h1>{text.loginTitle}</h1>
                      <ContactUsText />
                      <LoginForm />
                    </>
                  )}
                </>
              )}
            </>
          )}
        </Col>
      </Row>
      <ContactForm />
    </div>
  );
};

export default Login;
