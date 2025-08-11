import {
  Avatar,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Divider,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  HStack,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuGroup,
  MenuItem,
  MenuList,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverFooter,
  PopoverHeader,
  PopoverTrigger,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import { BiCalendarHeart, BiTrashAlt, BiUnlink } from 'react-icons/bi';
import { CiSettings } from 'react-icons/ci';
import { SiHackerrank, SiLeetcode } from 'react-icons/si';
import { VscCode } from 'react-icons/vsc';
import { GithubHandler } from '../handlers';

interface SettingsMenuProps {}

const SettingsMenu: React.FC<SettingsMenuProps> = () => {

  const [isOpen, setOpen] = useState<'unlink' | 'clear' | 'subdirectory' | 'platform-settings' | null>(null);
  const [githubUsername, setGithubUsername] = React.useState('');
  const [githubRepo, setGithubRepo] = React.useState('');
  const [newRepoURL, setNewRepoURL] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [enableVersioning, setEnableVersioning] = useState(false);

  // Provider settings state
  const [providerSettings, setProviderSettings] = useState<{
    leetcode: { enabled: boolean; subdirectory: string };
    hackerrank: { enabled: boolean; subdirectory: string };
  }>({
    leetcode: { enabled: true, subdirectory: 'leetcode' },
    hackerrank: { enabled: false, subdirectory: 'hackerrank' }
  });

  const [tempSubdirectoryValues, setTempSubdirectoryValues] = useState<{
    leetcode: string;
    hackerrank: string;
  }>({ leetcode: 'leetcode', hackerrank: 'hackerrank' });

  const unlinkRepo = async () => {
    chrome.storage.sync.set(
      {
        github_leetsync_repo: null,
      },
      () => {
        setGithubRepo('');
        //refresh the page
        window.location.reload();
      },
    );
  };
  const handleLinkRepo = async () => {
    if (!newRepoURL) return setError('Repository URL is required');
    if (!accessToken) return setError('Access token is required');

    const repoName = newRepoURL.split('/').pop();
    const username = newRepoURL.split('/').slice(-2)[0];
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
      setGithubRepo(repoName);
      setOpen(null);
    });
  };
  const resetAll = () => {
    chrome.storage.sync.clear(() => {
      window.location.reload();
    });
  };

  const trimSubdirectory = (text: string) => {
    return text.replace(/^\/+|\/+$/g, '');
  };


  // Toggle provider on/off
  const toggleProvider = async (provider: 'leetcode' | 'hackerrank') => {
    const updatedSettings = {
      ...providerSettings,
      [provider]: {
        ...providerSettings[provider],
        enabled: !providerSettings[provider].enabled
      }
    };

    await chrome.storage.sync.set({
      provider_settings: updatedSettings
    });

    setProviderSettings(updatedSettings);
  };

  // Unified save function for platform settings popup
  const saveAllProviderSettings = async () => {
    setError('');
    setLoading(true);
    
    // Validate all subdirectories
    for (const [provider, settings] of Object.entries(tempSubdirectoryValues)) {
      const subdirectory = settings || provider;
      if (!subdirectory?.match(/^[a-zA-Z0-9-_/]+$/)) {
        setLoading(false);
        return setError(`Invalid subdirectory for ${provider}`);
      }
    }
    
    // Update provider settings with temp values
    const updatedSettings = {
      ...providerSettings,
      leetcode: {
        ...providerSettings.leetcode,
        subdirectory: trimSubdirectory(tempSubdirectoryValues.leetcode || 'leetcode')
      },
      hackerrank: {
        ...providerSettings.hackerrank,
        subdirectory: trimSubdirectory(tempSubdirectoryValues.hackerrank || 'hackerrank')
      }
    };
    
    await chrome.storage.sync.set({
      provider_settings: updatedSettings
    });
    
    setProviderSettings(updatedSettings);
    setLoading(false);
    setOpen(null);
  };

  useEffect(() => {
    chrome.storage.sync.get(
      ['github_username', 'github_leetsync_repo', 'github_leetsync_token', 'github_leetsync_subdirectory', 'github_leetsync_versioning', 'provider_settings'],
      async (result) => {
        const { github_username, github_leetsync_repo, github_leetsync_token, github_leetsync_subdirectory, github_leetsync_versioning, provider_settings } = result;
        setGithubUsername(github_username);
        setGithubRepo(github_leetsync_repo);
        setAccessToken(github_leetsync_token);
        setEnableVersioning(github_leetsync_versioning);

        // Handle provider settings migration and initialization
        if (provider_settings) {
          setProviderSettings(provider_settings);
          setTempSubdirectoryValues({
            leetcode: provider_settings.leetcode?.subdirectory || 'leetcode',
            hackerrank: provider_settings.hackerrank?.subdirectory || 'hackerrank'
          });
        } else {
          // Migration: Convert old single subdirectory to new provider structure
          const migratedSettings = {
            leetcode: {
              enabled: true,
              subdirectory: github_leetsync_subdirectory || 'leetcode'
            },
            hackerrank: {
              enabled: false,
              subdirectory: 'hackerrank'
            }
          };

          await chrome.storage.sync.set({
            provider_settings: migratedSettings
          });

          setProviderSettings(migratedSettings);
          setTempSubdirectoryValues({
            leetcode: migratedSettings.leetcode.subdirectory,
            hackerrank: migratedSettings.hackerrank.subdirectory
          });
        }
      },
    );
  }, []);

  if (!githubUsername || !githubRepo || !accessToken) return null;
  return (
    <Menu size={'lg'} placement="bottom-end">
      <MenuButton as={IconButton} aria-label="Options" icon={<CiSettings />} variant="outline" />
      <MenuList fontSize={'14px'}>
        <HStack px={4} py={2}>
          <Avatar name={githubUsername} size="sm" />
          <VStack spacing={0} align="flex-start">
            <Text fontSize={'sm'} fontWeight={'semibold'}>
              {githubUsername}
            </Text>
            <Text fontSize={'xs'} color={'gray.500'}>
              {githubRepo}
            </Text>
          </VStack>
        </HStack>
        <Divider />
        <MenuGroup title="General">
          <Popover
            isOpen={isOpen === 'unlink'}
            onClose={() => setOpen(null)}
            placement="bottom-start"
            closeOnBlur={false}
          >
            <PopoverTrigger>
              <MenuItem
                h="100%"
                icon={<BiUnlink fontSize={'1.2rem'} />}
                minH="40px"
                onClick={() => setOpen('unlink')}
                closeOnSelect={false}
              >
                Change or unlink repo
              </MenuItem>
            </PopoverTrigger>
            <PopoverContent zIndex={1000000}>
              <PopoverHeader fontWeight="semibold">Change or unlink repo</PopoverHeader>
              <PopoverArrow />
              <PopoverCloseButton />
              <PopoverBody>
                <FormControl isInvalid={!!error}>
                  <Input
                    placeholder="New Repository URL"
                    value={newRepoURL}
                    onChange={(e) => {
                      setNewRepoURL(e.target.value);
                    }}
                    size="sm"
                  />
                  {!error ? (
                    <FormHelperText fontSize={'xs'}>Paste the new repository URL.</FormHelperText>
                  ) : (
                    <FormErrorMessage fontSize={'xs'}>{error}</FormErrorMessage>
                  )}
                </FormControl>
              </PopoverBody>
              <PopoverFooter display="flex" justifyContent="flex-end">
                <HStack w="100%" justify={'space-between'}>
                  <Button colorScheme={'red'} variant={'outline'} size="sm" onClick={unlinkRepo} isDisabled={loading}>
                    Unlink Repo
                  </Button>
                  <ButtonGroup size="sm">
                    <Button variant="outline" isLoading={loading} onClick={() => setOpen(null)}>
                      Cancel
                    </Button>
                    <Button colorScheme="green" onClick={handleLinkRepo} isDisabled={loading || !newRepoURL}>
                      Save
                    </Button>
                  </ButtonGroup>
                </HStack>
              </PopoverFooter>
            </PopoverContent>
          </Popover>
          <Popover 
            isOpen={isOpen === 'platform-settings'} 
            onClose={() => setOpen(null)} 
            closeOnBlur={false}
          >
            <PopoverTrigger>
              <MenuItem
                h="100%"
                icon={<VscCode fontSize={'1.2rem'} />}
                minH="40px"
                onClick={() => setOpen('platform-settings')}
                closeOnSelect={false}
              >
                Platform Settings
              </MenuItem>
            </PopoverTrigger>
            <PopoverContent zIndex={10000} w="450px">
              <PopoverHeader fontWeight="semibold">Platform Settings</PopoverHeader>
              <PopoverArrow />
              <PopoverCloseButton />
              <PopoverBody>
                <VStack align="start" spacing={4}>
                  {/* LeetCode Section */}
                  <Box w="100%">
                    <HStack justify="space-between" w="100%" mb={2}>
                      <HStack>
                        <SiLeetcode color="#FFA500" fontSize="1.2rem" />
                        <Box>
                          <Text fontWeight="medium">LeetCode</Text>
                          <Text fontSize="xs" color="gray.500">Sync LeetCode submissions</Text>
                        </Box>
                      </HStack>
                      <Switch
                        isChecked={providerSettings.leetcode.enabled}
                        onChange={() => toggleProvider('leetcode')}
                        colorScheme="orange"
                        size="sm"
                      />
                    </HStack>
                    {providerSettings.leetcode.enabled && (
                      <Box pl={6}>
                        <Text fontSize="sm" mb={1} color="gray.600">Subdirectory:</Text>
                        <Input 
                          size="sm"
                          placeholder="leetcode"
                          value={tempSubdirectoryValues.leetcode}
                          onChange={(e) => setTempSubdirectoryValues(prev => ({...prev, leetcode: e.target.value}))}
                        />
                      </Box>
                    )}
                  </Box>

                  {/* HackerRank Section */}
                  <Box w="100%">
                    <HStack justify="space-between" w="100%" mb={2}>
                      <HStack>
                        <SiHackerrank color="#00EA64" fontSize="1.2rem" />
                        <Box>
                          <Text fontWeight="medium">HackerRank</Text>
                          <HStack>
                            <Text fontSize="xs" color="gray.500">Sync HackerRank submissions</Text>
                            <Badge size="sm" fontSize="xs" colorScheme="blue">Coming Soon</Badge>
                          </HStack>
                        </Box>
                      </HStack>
                      <Switch
                        isChecked={providerSettings.hackerrank.enabled}
                        onChange={() => toggleProvider('hackerrank')}
                        colorScheme="green"
                        size="sm"
                      />
                    </HStack>
                    {providerSettings.hackerrank.enabled && (
                      <Box pl={6}>
                        <Text fontSize="sm" mb={1} color="gray.600">Subdirectory:</Text>
                        <Input 
                          size="sm"
                          placeholder="hackerrank"
                          value={tempSubdirectoryValues.hackerrank}
                          onChange={(e) => setTempSubdirectoryValues(prev => ({...prev, hackerrank: e.target.value}))}
                        />
                      </Box>
                    )}
                  </Box>
                </VStack>
                
                {error && (
                  <FormControl isInvalid mt={3}>
                    <FormErrorMessage fontSize={'xs'}>{error}</FormErrorMessage>
                  </FormControl>
                )}
              </PopoverBody>
              <PopoverFooter display="flex" justifyContent="flex-end">
                <ButtonGroup size="sm">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      // Reset temp values to current settings
                      setTempSubdirectoryValues({
                        leetcode: providerSettings.leetcode.subdirectory,
                        hackerrank: providerSettings.hackerrank.subdirectory
                      });
                      setOpen(null);
                    }}
                    isLoading={loading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    colorScheme="blue" 
                    onClick={saveAllProviderSettings}
                    isLoading={loading}
                  >
                    Save Settings
                  </Button>
                </ButtonGroup>
              </PopoverFooter>
            </PopoverContent>
          </Popover>

          <MenuItem
            h="100%"
            icon={<BiCalendarHeart fontSize={'1.2rem'} />}
            minH="40px"
            onClick={() => window.open('https://strawpoll.com/polls/wAg3AEW0Oy8', '_blank')}
          >
            Set a reminder{' '}
            <Badge size="sm" fontSize={'xs'} colorScheme="gray">
              Soon 🤩
            </Badge>
          </MenuItem>
        </MenuGroup>
        <Divider />
        <MenuGroup title="Versioning Settings" ml={3} mb={2}>
          <MenuItem 
            as={Flex} 
            justifyContent="space-between" 
            alignItems="center"
            onClick={(e) => {
              e.preventDefault();
              const newValue = !enableVersioning;
              chrome.storage.sync.set({ github_leetsync_versioning: newValue });
              setEnableVersioning(newValue);
            }}
          >
            <Box>
              <Text fontWeight="medium">Solution Versioning</Text>
              <Text fontSize="sm" color="gray.500">
                Create new files for each submission
              </Text>
            </Box>
            <Switch
              isChecked={enableVersioning}
              pointerEvents="none" // Prevent switch from capturing clicks
              ml={4}
              colorScheme="blue"
            />
          </MenuItem>
        </MenuGroup>
        <Divider />
        <MenuGroup title="Danger Area">
          <Popover
            isOpen={isOpen === 'clear'}
            onClose={() => setOpen(null)}
            placement="bottom-start"
            closeOnBlur={false}
          >
            <PopoverTrigger>
              <MenuItem
                h="100%"
                icon={<BiTrashAlt fontSize={'1.2rem'} />}
                bgColor={'red.50'}
                color="red.500"
                minH="40px"
                onClick={() => setOpen('clear')}
                closeOnSelect={false}
              >
                Reset All
              </MenuItem>
            </PopoverTrigger>
            <PopoverContent zIndex={1000000}>
              <PopoverHeader fontWeight="semibold">Reset all your data</PopoverHeader>
              <PopoverArrow />
              <PopoverCloseButton />
              <PopoverBody>
                <Text fontSize={'sm'}>
                  This will reset all your data, including your linked GitHub repository and solved problems data. This
                  action cannot be undone.
                </Text>
              </PopoverBody>
              <PopoverFooter display="flex" justifyContent="flex-end">
                <ButtonGroup size="sm">
                  <Button variant="outline" isLoading={loading} onClick={() => setOpen(null)}>
                    Cancel
                  </Button>
                  <Button colorScheme={'red'} variant={'outline'} size="sm" onClick={resetAll}>
                    I understand, Reset All
                  </Button>
                </ButtonGroup>
              </PopoverFooter>
            </PopoverContent>
          </Popover>
        </MenuGroup>
      </MenuList>
    </Menu>
  );
};
export default SettingsMenu;
