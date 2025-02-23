import {
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  Heading,
  Input,
  InputGroup,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { BsGithub } from 'react-icons/bs';
import { SiLeetcode } from 'react-icons/si';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { GITHUB_REDIRECT_URI, GITHUB_CLIENT_ID } from '../constants';
import { GithubHandler } from '../handlers';
import { Footer } from './Footer';

const AuthorizeWithGtihub = ({ nextStep }: { nextStep: Function }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [personalToken, setPersonalToken] = useState('');
  const [isPersonalTokenMode, setIsPersonalTokenMode] = useState(false);
  const [isTokenError, setIsTokenError] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const github = new GithubHandler();

  const handleClicked = () => {
    github.setAuthStrategy('oauth');
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${GITHUB_REDIRECT_URI}&scope=repo`;

    chrome.tabs.create({ url: authUrl, active: true }, function (x) {
      chrome.tabs.getCurrent(function (tab) {
        if (!tab?.id) return;
        chrome.tabs.remove(tab?.id, function () {});
      });
    });
  };

  const validateAndSavePersonalToken = async () => {
    setIsValidating(true);
    setIsTokenError(false);

    try {
      github.setAuthStrategy('personal_token');
      const token = await github.fetchToken({ personalToken });
      
      // Save the token
      chrome.storage.sync.set({ 
        github_leetsync_token: token,
        github_auth_type: 'personal_token'  // Save the auth type
      }, () => {
        setAccessToken(token);
      });
    } catch (error) {
      setIsTokenError(true);
    }

    setIsValidating(false);
  };

  useEffect(() => {
    if (accessToken && accessToken.length > 0) {
      nextStep();
    }
  }, [accessToken]);

  useEffect(() => {
    chrome.storage.sync.get(['github_leetsync_token', 'github_auth_type'], (result) => {
      if (result.github_leetsync_token) {
        setAccessToken(result.github_leetsync_token);
        // Set the correct auth strategy based on stored type
        if (result.github_auth_type) {
          github.setAuthStrategy(result.github_auth_type as 'oauth' | 'personal_token');
        }
      }
    });
  }, []);

  return (
    <VStack w='100%' spacing={4}>
      <VStack pb={4}>
        <Heading size='md'>Authorize with GitHub</Heading>
        <Text fontSize='sm' color='gray.500' textAlign='center'>
          Choose how you want to authorize with GitHub
        </Text>
      </VStack>

      {!isPersonalTokenMode ? (
        <>
          <Button
            leftIcon={<BsGithub />}
            colorScheme='gray'
            variant='solid'
            width='100%'
            onClick={handleClicked}
          >
            Authorize with GitHub
          </Button>
          <Text fontSize='sm' color='gray.500'>
            or
          </Text>
          <Button
            variant='link'
            color='blue.500'
            onClick={() => setIsPersonalTokenMode(true)}
          >
            Use Personal Access Token
          </Button>
        </>
      ) : (
        <>
          <FormControl isInvalid={isTokenError}>
            <InputGroup>
              <Input
                placeholder="Enter Personal Access Token"
                value={personalToken}
                onChange={(e) => setPersonalToken(e.target.value)}
                type="password"
              />
            </InputGroup>
            {isTokenError && (
              <FormErrorMessage>Invalid personal access token</FormErrorMessage>
            )}
            <FormHelperText>
              Token needs 'repo' scope. Create one at GitHub Settings → Developer Settings → Personal Access Tokens
            </FormHelperText>
          </FormControl>
          <Button
            colorScheme="blue"
            width="100%"
            onClick={validateAndSavePersonalToken}
            isLoading={isValidating}
          >
            Validate & Continue
          </Button>
          <Button
            variant="link"
            color="gray.500"
            onClick={() => setIsPersonalTokenMode(false)}
          >
            Back to GitHub OAuth
          </Button>
        </>
      )}
    </VStack>
  );
};

const AuthorizeWithLeetCode = ({ nextStep }: { nextStep: Function }) => {
  const [leetcodeSession, setLeetcodeSession] = useState<string | null>(null);

  const handleClicked = () => {
    const authUrl = `https://leetcode.com/accounts/login/`;
    chrome.storage.sync.set({ pipe_leethub: true }, () => {
      chrome.tabs.create({ url: authUrl, active: true }, function (x) {
        chrome.tabs.getCurrent(function (tab) {
          if (!tab?.id) return;
          chrome.tabs.remove(tab?.id, function () {});
        });
      });
    });
  };
  useEffect(() => {
    if (leetcodeSession && leetcodeSession.length > 0) {
      nextStep();
    }
  }, [leetcodeSession]);

  useEffect(() => {
    chrome.storage.sync.get(['leetcode_session'], (result) => {
      if (result.leetcode_session) {
        setLeetcodeSession(result.leetcode_session);
      }
    });
  }, []);

  return (
    <VStack w='100%'>
      <VStack>
        <Heading size='md'>Authorize LeetCode</Heading>
        <Text color='GrayText' fontSize={'sm'} w='90%' textAlign={'center'}>
          To sync your submissions on LeetCode, we need access to your account
          first.
        </Text>
      </VStack>

      <Button
        colorScheme={'yellow'}
        w='100%'
        onClick={handleClicked}
        leftIcon={<SiLeetcode />}
      >
        Login with LeetCode
      </Button>
    </VStack>
  );
};

const SelectRepositoryStep = ({ nextStep }: { nextStep: Function }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [repositoryURL, setRepositoryURL] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLinkRepo = async () => {
    if (!repositoryURL) return setError('Repository URL is required');
    if (!accessToken) return setError('Access token is required');

    const repoName = repositoryURL.split('/').pop();
    const username = repositoryURL.split('/').slice(-2)[0];
    if (!repoName || !username) {
      return setError('Invalid repository URL');
    }

    setLoading(true);
    const github = new GithubHandler();
    const isFound = await github.checkIfRepoExists(`${username}/${repoName}`);
    setLoading(false);
    if (!isFound) {
      return setError('Repository not found');
    }
    chrome.storage.sync.set({ github_leetsync_repo: repoName }, () => {
      console.log('Repository Linked Successfully');
      navigate(0);
    });
  };

  useEffect(() => {
    chrome.storage.sync.get(['github_leetsync_token'], (result) => {
      if (!result.github_leetsync_token) return;
      setAccessToken(result.github_leetsync_token);
    });
  }, []);

  return (
    <VStack w='100%'>
      <VStack>
        <Heading size='md'>Link a Repository</Heading>
        <Text color='GrayText' fontSize={'sm'} w='90%' textAlign={'center'}>
          One last step, we need to know which repository you want to push your
          code to 🤓
        </Text>
      </VStack>

      {/* If you add the size prop to `InputGroup`, it'll pass it to all its children. */}
      <FormControl isRequired isInvalid={!!error}>
        <InputGroup size='sm'>
          <Input
            placeholder='Repository URL'
            value={repositoryURL}
            onChange={(e) => {
              setRepositoryURL(e.target.value);
            }}
          />
        </InputGroup>
        {!error ? (
          <FormHelperText fontSize={'xs'}>
            Paste the repository URL to push your submissions to.
          </FormHelperText>
        ) : (
          <FormErrorMessage fontSize={'xs'}>{error}</FormErrorMessage>
        )}
      </FormControl>
      <Button
        colorScheme={'gray'}
        w='100%'
        onClick={handleLinkRepo}
        isLoading={loading}
        isDisabled={loading || !repositoryURL}
        size='sm'
      >
        Link Repository
      </Button>
      <small>You can change this later.</small>
    </VStack>
  );
};

const StartOnboarding = ({ nextStep }: { nextStep: Function }) => {
  return (
    <VStack w='100%' h='100%' align='center' justify={'center'}>
      <Logo />
      <VStack w='100%'>
        <Heading size='lg'>Welcome 👋</Heading>
        <Text color='GrayText' fontSize={'sm'} w='90%' textAlign={'center'}>
          LeetSync is a Chrome extension that syncs your submissions to GitHub.
          Setup now.
        </Text>
      </VStack>

      <VStack w='100%' py={4}>
        <Button
          size='md'
          colorScheme={'green'}
          w='95%'
          onClick={() => nextStep()}
        >
          Complete Setup
        </Button>
        <Text fontSize={'xs'} color='gray.400'>
          This will take less than 2 minutes
        </Text>
      </VStack>
      <Footer />
    </VStack>
  );
};

export {
  StartOnboarding,
  AuthorizeWithGtihub,
  AuthorizeWithLeetCode,
  SelectRepositoryStep,
};
