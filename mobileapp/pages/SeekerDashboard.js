import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Animated, Linking, ScrollView, Platform, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import { getProfile, searchJobs, applyToJob, getTrendingSkills, getJobsAppliedFor } from '../utils/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import axios from 'axios';
import Icon from 'react-native-vector-icons/FontAwesome';

export default function SeekerDashboard({ isDarkMode, toggleDarkMode, route }) {
  const [user, setUser] = useState(route?.params?.user || null);
  const [searchSkills, setSearchSkills] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [trendingJobs, setTrendingJobs] = useState([]);
  const [suggestedJobs, setSuggestedJobs] = useState([]);
  const [message, setMessage] = useState('');
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [showAppliedJobs, setShowAppliedJobs] = useState(false);
  const navigation = useNavigation();
  const [applyScales, setApplyScales] = useState({});
  const [connectScales, setConnectScales] = useState({});
  const [profileScale] = useState(new Animated.Value(1));
  const [logoutScale] = useState(new Animated.Value(1));
  const [downloadScale] = useState(new Animated.Value(1));
  const [searchScale] = useState(new Animated.Value(1));
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);
   
  const fetchData = async () => {
    console.log("user=",user)
    try {
      if (!user) {
        const isEmail = route.params.contact.includes('@');
        const response = await getProfile({
          role: 'seeker',
          ...(isEmail ? { email: route.params.contact } : { whatsappNumber: route.params.contact }),
        });
        const fetchedUser = response.data || {};
        setUser(fetchedUser);
        setAppliedJobs(fetchedUser.appliedJobs || []);
      }

      const jobResponse = await searchJobs({ available: true });
      const allJobs = jobResponse.data
        .filter(job => job && job._id && job.available)
        .map(job => ({
          ...job,
          applied: appliedJobs.some(applied => applied.jobId === job._id),
        }));

      if (user?.skills?.length) {
        const userSkills = Array.isArray(user.skills) ? user.skills : user.skills.split(',').map(s => s.trim());
        const filteredJobs = allJobs
          .filter(job => job.skills && job.skills.some(skill => userSkills.includes(skill)))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setSuggestedJobs(filteredJobs);
      }

      const trendingResponse = await getTrendingSkills();
      setTrendingJobs(trendingResponse.data.data);

      const scales = {};
      allJobs.forEach(job => {
        scales[job._id] = { apply: new Animated.Value(1), connect: new Animated.Value(1) };
      });
      setApplyScales(scales);
      setConnectScales(scales);
    } catch (error) {
      console.error('Fetch Data Error:', error);
      setMessage('Error fetching data: ' + error.message);
    }
  };

  const handleGetAppliedJobs = async () => {
  try {
    const seekerId = user?._id;
    const response = await getJobsAppliedFor(seekerId);
    console.log("API response for applied jobs:", response);
    
    // Get the full job details from API response
    const apiJobs = response.data.data || [];
    console.log("Jobs from API:", apiJobs);
    
    // Get the status information from user's appliedJobs
    const userAppliedJobs = user?.appliedJobs || [];
    console.log("User's applied jobs with status:", userAppliedJobs);
    
    // Merge the data to include both job details and status
    const mergedJobs = apiJobs.map(job => {
      // Find matching job in user's appliedJobs to get status
      const userJob = userAppliedJobs.find(
        appliedJob => appliedJob.jobId === job._id
      );
      
      return {
        ...job,
        status: userJob?.status || 'Applied', // Default to 'Applied' if status not found
        _id: job._id, // Ensure we have the job ID
      };
    });
    
    console.log("Merged jobs with status:", mergedJobs);
    setAppliedJobs(mergedJobs);
    setShowAppliedJobs(true);
  } catch (err) {
    console.error('Error fetching applied jobs:', err);
  }
};

  const handleSearch = async () => {
    try {
      const searchData = {
        skills: searchSkills.split(',').map(skill => skill.trim()).filter(skill => skill),
        location: searchLocation.trim(),
        available: true
      };

      const response = await searchJobs(searchData);
      const filteredJobs = response.data
        .filter(job => job && job._id && job.available)
        .map(job => ({
          ...job,
          applied: appliedJobs.some(applied => applied.jobId === job._id),
        }));

      setSuggestedJobs(filteredJobs.slice(0, 5));
      setMessage(filteredJobs.length === 0 ? 'No active jobs found matching your criteria' : '');
    } catch (error) {
      console.error('Search Error:', error.response?.data || error);
      setMessage('Error searching jobs: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleApply = async (jobId) => {
    try {
      const response = await applyToJob({ seekerId: user._id, jobId });
      setAppliedJobs(prev => [
        ...prev.filter(job => job.jobId !== jobId),
        {
          jobId,
          title: suggestedJobs.find(job => job._id === jobId)?.jobTitle || 'Unknown',
          status: 'Applied',
          skills: suggestedJobs.find(job => job._id === jobId)?.skills || [],
          location: suggestedJobs.find(job => job._id === jobId)?.location || 'N/A'
        }
      ]);
      setSuggestedJobs(prev => prev.map(job => job._id === jobId ? { ...job, applied: true } : job));
      setTrendingJobs(prev => prev.map(job => job._id === jobId ? { ...job, applied: true } : job));
      setMessage(response.message || 'Applied successfully');
    } catch (error) {
      setMessage('Error applying to job: ' + error.message);
    }
  };

  const handleWhatsAppConnect = async (number, jobId, jobTitle) => {
    try {
      const response = await axios.post(`https://jobconnectqa-2.onrender.com/api/jobs/apply-job`, {
        seekerId: user._id,
        jobId: jobId,
        title: jobTitle,
        status: 'Connected'
      });

      const jobDetails = suggestedJobs.find(job => job._id === jobId) || trendingJobs.find(job => job._id === jobId);

      setAppliedJobs(prev => [
        ...prev.filter(job => job.jobId !== jobId),
        {
          jobId,
          title: jobTitle,
          status: 'Connected',
          skills: jobDetails?.skills || [],
          location: jobDetails?.location || 'N/A'
        }
      ]);

      if (!number.startsWith('+')) {
        number = '+91' + number;
      }
      const message = `Hi, I'm interested in your job posting: ${jobTitle}`;
      Linking.openURL(`https://api.whatsapp.com/send?phone=${number.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`);
    } catch (error) {
      console.error("Error connecting via WhatsApp:", error);
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('SeekerProfile', { user });
  };

  const handlePressIn = (scale) => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  const handlePressOut = (scale) => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  const formatSkills = (skills) => {
    if (Array.isArray(skills)) return skills.join(', ');
    if (typeof skills === 'string') return skills;
    return 'N/A';
  };

  const handleViewJobDetails = (job) => {
    setShowJobDetails(true);
    setSelectedJob(job);
  }

  const renderJobItem = ({ item }) => (
    <View style={styles.jobItem}>
      <Text style={[isDarkMode ? styles.darkText : styles.lightText]}>
        {item.skills?.map((skill, index) => (
          <Text key={index}>
            {skill}
            {index !== item.skills.length - 1 ? " | " : ""}
          </Text>
        ))}
      </Text>
      <Text style={[styles.jobDetail, isDarkMode ? styles.darkText : styles.lightText]}>
        Location: {item.location || 'N/A'}
      </Text>
      <View style={styles.jobActions}>
        <TouchableOpacity
          style={[styles.actionButton, isDarkMode ? styles.darkButton : styles.lightButton, item.applied && styles.disabledButton]}
          onPress={() => handleApply(item._id)}
          onPressIn={() => handlePressIn(applyScales[item._id]?.apply)}
          onPressOut={() => handlePressOut(applyScales[item._id]?.apply)}
          disabled={item.applied}
        >
          <Animated.View style={{ transform: [{ scale: applyScales[item._id]?.apply || new Animated.Value(1) }] }}>
            <Text style={styles.buttonText}>
              {item.applied ? 'Applied' : 'Apply'}
            </Text>
          </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, isDarkMode ? styles.darkButton : styles.lightButton]}
          onPress={() => handleWhatsAppConnect(item.postedBy?.hrWhatsappNumber || '', item._id, item.jobTitle || item.skills[0])}
          onPressIn={() => handlePressIn(connectScales[item._id]?.connect)}
          onPressOut={() => handlePressOut(connectScales[item._id]?.connect)}
        >
          <Animated.View style={{ transform: [{ scale: connectScales[item._id]?.connect || new Animated.Value(1) }] }}>
            <Text style={styles.buttonText}>WhatsApp</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const keyExtractor = (item, index) => {
    return item?._id ? item._id.toString() : `index-${index}`;
  };

  return (
    <View style={[styles.container, isDarkMode ? styles.darkContainer : styles.lightContainer]}>
      <Header title="Seeker Dashboard" toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topButtons}>
          <TouchableOpacity
            style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
            onPress={handleEditProfile}
            onPressIn={() => handlePressIn(profileScale)}
            onPressOut={() => handlePressOut(profileScale)}
          >
            <Animated.View style={{ transform: [{ scale: profileScale }] }}>
              <Text style={styles.buttonText}>Edit Profile</Text>
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
            onPress={handleGetAppliedJobs}
            onPressIn={() => handlePressIn(profileScale)}
            onPressOut={() => handlePressOut(profileScale)}
          >
            <Animated.View style={{ transform: [{ scale: profileScale }] }}>
              <Text style={styles.buttonText}>View Applied Jobs</Text>
            </Animated.View>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {user ? (
            <>
              <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>Your Profile</Text>
              <View style={[styles.profileContainer, isDarkMode ? styles.darkProfileContainer : styles.lightProfileContainer]}>
                <Text style={[styles.profileText, isDarkMode ? styles.darkText : styles.lightText]}>
                  Name: {user.fullName || 'N/A'}
                </Text>
                <Text style={[styles.profileText, isDarkMode ? styles.darkText : styles.lightText]}>
                  Email: {user.email || 'N/A'}
                </Text>
                <Text style={[styles.profileText, isDarkMode ? styles.darkText : styles.lightText]}>
                  WhatsApp: {user.whatsappNumber || 'N/A'}
                </Text>
                <Text style={[styles.profileText, isDarkMode ? styles.darkText : styles.lightText]}>
                  Job Names: {formatSkills(user.skills)}
                </Text>
                <Text style={[styles.profileText, isDarkMode ? styles.darkText : styles.lightText]}>
                  Experience: {user.experience || 0} years
                </Text>
                <Text style={[styles.profileText, isDarkMode ? styles.darkText : styles.lightText]}>
                  Location: {user.location || 'N/A'}
                </Text>
              </View>

              <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>Search Jobs</Text>
              <Text style={[styles.label, isDarkMode ? styles.darkText : styles.lightText]}>Search By Job Name</Text>
              <TextInput
                style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                value={searchSkills}
                onChangeText={setSearchSkills}
                placeholder="Enter Job Names (comma-separated)"
                placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
              />
              <Text style={[styles.label, isDarkMode ? styles.darkText : styles.lightText]}>Search By Location</Text>
              <TextInput
                style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                value={searchLocation}
                onChangeText={setSearchLocation}
                placeholder="Enter location"
                placeholderTextColor={isDarkMode ? '#888' : '#ccc'}
              />
              <TouchableOpacity
                style={[styles.button, isDarkMode ? styles.darkButton : styles.lightButton]}
                onPress={handleSearch}
                onPressIn={() => handlePressIn(searchScale)}
                onPressOut={() => handlePressOut(searchScale)}
              >
                <Animated.View style={{ transform: [{ scale: searchScale }] }}>
                  <Text style={styles.buttonText}>Search</Text>
                </Animated.View>
              </TouchableOpacity>

              <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>Suggested Jobs</Text>
              <FlatList
                data={suggestedJobs}
                keyExtractor={keyExtractor}
                renderItem={renderJobItem}
                scrollEnabled={false}
              />

              <Text style={[styles.title, isDarkMode ? styles.darkText : styles.lightText]}>Trending Jobs</Text>
              <FlatList
                data={trendingJobs}
                keyExtractor={keyExtractor}
                renderItem={renderJobItem}
                scrollEnabled={false}
              />

              {message && <Text style={[styles.message, isDarkMode ? styles.darkText : styles.lightText]}>{message}</Text>}
            </>
          ) : (
            <Text style={[styles.loading, isDarkMode ? styles.darkText : styles.lightText]}>Loading profile...</Text>
          )}
        </View>
      </ScrollView>

      {/* Applied Jobs Modal */}
      <Modal visible={showAppliedJobs} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, isDarkMode ? styles.darkModalContent : styles.lightModalContent]}>
            <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>Applied Jobs</Text>
            <FlatList
              data={appliedJobs}
              keyExtractor={(item, index) => item?._id ? item._id.toString() : index.toString()}
              renderItem={({ item }) => (
                <View style={styles.appliedJobItem}>
                  <View style={styles.jobDetails}>
                    <Text style={styles.appliedJobText}>
                      {item.title || item.skills?.join(' | ') || 'Unknown Job'}
                    </Text>
                    <Text style={styles.jobLocation}>
                      Location: {item.location || 'N/A'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.detailsButton,
                      item.status === 'Connected' ? styles.whatsappButton : styles.normalButton
                    ]}
                    onPress={() => handleViewJobDetails(item)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {item.status === 'Connected' && (
                        <Icon
                          name="whatsapp"
                          size={20}
                          color="#fff"
                          style={{ marginRight: 5 }}
                        />
                      )}
                      <Text style={styles.detailsButtonText}>
                        {item.status === 'Connected' ? 'Applied via WhatsApp' : 'View Details'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            />
            <TouchableOpacity
              style={[styles.closeButton, isDarkMode ? styles.darkButton : styles.lightButton]}
              onPress={() => setShowAppliedJobs(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Job Details Modal */}
      <Modal visible={showJobDetails} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, isDarkMode ? styles.darkModalContent : styles.lightModalContent]}>
            <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>Job Details</Text>
            {selectedJob && (
              <>
                <Text style={[styles.jobDetailMain, isDarkMode ? styles.darkText : styles.lightText]}>
                  {selectedJob.skills?.map((skill, index) => (
                    <Text key={index}>
                      {skill}
                      {index !== selectedJob.skills.length - 1 ? " | " : ""}
                    </Text>
                  ))}
                </Text>
                <Text style={[styles.jobDetailText, isDarkMode ? styles.darkText : styles.lightText]}>
                  <Text style={styles.bold}>Company:</Text> {selectedJob.postedBy?.companyName || 'N/A'}
                </Text>
                <Text style={[styles.jobDetailText, isDarkMode ? styles.darkText : styles.lightText]}>
                  <Text style={styles.bold}>Location:</Text> {selectedJob.location || 'N/A'}
                </Text>
                <Text style={[styles.jobDetailText, isDarkMode ? styles.darkText : styles.lightText]}>
                  <Text style={styles.bold}>Salary:</Text> {selectedJob.maxCTC || 'Not disclosed'}
                </Text>
                {selectedJob.postedBy?.hrWhatsappNumber && (
                  <TouchableOpacity
                    style={styles.whatsappButton}
                    onPress={() => handleWhatsAppConnect(
                      selectedJob.postedBy.hrWhatsappNumber,
                      selectedJob._id,
                      selectedJob.jobTitle || selectedJob.skills[0]
                    )}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon
                        name="whatsapp"
                        size={20}
                        color="#fff"
                        style={{ marginRight: 5 }}
                      />
                      <Text style={styles.detailsButtonText}>Connect via WhatsApp</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </>
            )}
            <TouchableOpacity
              style={[styles.closeButton, isDarkMode ? styles.darkButton : styles.lightButton]}
              onPress={() => setShowJobDetails(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Footer isDarkMode={isDarkMode} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightContainer: { backgroundColor: '#fff' },
  darkContainer: { backgroundColor: '#111' },
  scrollContent: { paddingBottom: 60, flexGrow: 1 },
  topButtons: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, marginTop: 10 },
  content: { padding: 10, flexGrow: 1 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  profileContainer: { padding: 10, borderRadius: 5, marginBottom: 20 },
  lightProfileContainer: { backgroundColor: '#f0f0f0' },
  darkProfileContainer: { backgroundColor: '#333' },
  profileText: { fontSize: 16, marginBottom: 5 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 },
  lightInput: { borderColor: '#ccc', color: '#000' },
  darkInput: { borderColor: '#555', color: '#ddd', backgroundColor: '#333' },
  jobItem: { padding: 10, borderBottomWidth: 1, borderColor: '#ccc' },
  jobText: { fontSize: 16, fontWeight: 'bold' },
  jobDetail: { fontSize: 14, color: '#666', marginTop: 2 },
  jobActions: { flexDirection: 'row', gap: 10, marginTop: 5 },
  actionButton: { padding: 5, borderRadius: 5 },
  disabledButton: { backgroundColor: '#666' },
  button: { paddingVertical: 15, paddingHorizontal: 30, borderRadius: 25, alignItems: 'center', marginBottom: 10 },
  lightButton: { backgroundColor: '#007AFF' },
  darkButton: { backgroundColor: '#005BB5' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  message: { marginTop: 10, textAlign: 'center' },
  loading: { fontSize: 16, textAlign: 'center' },
  lightText: { color: '#000' },
  darkText: { color: '#ddd' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '80%', padding: 20, borderRadius: 10 },
  lightModalContent: { backgroundColor: '#fff' },
  darkModalContent: { backgroundColor: '#333' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  appliedJobItem: { padding: 10, borderBottomWidth: 1, marginBottom: 10 },
  lightAppliedJobItem: { borderColor: '#ddd', backgroundColor: '#f9f9f9' },
  darkAppliedJobItem: { borderColor: '#555', backgroundColor: '#222' },
  appliedJobText: { fontSize: 16 },
  jobDetails: { flex: 1, marginBottom: 5 },
  label: {
    fontSize: 15,
    fontWeight: "700",
    paddingHorizontal: 4,
    marginBottom: 5,
  },
  detailsButton: {
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 5,
  },
  normalButton: {
    backgroundColor: '#007AFF',
  },
  detailsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  statusText: {
    fontSize: 14,
    marginTop: 3,
    fontStyle: 'italic',
  },
  connectedStatus: {
    color: '#25D366',
  },
  appliedStatus: {
    color: '#007AFF',
  },
  jobDetailText: {
    fontSize: 16,
    marginBottom: 5,
    lineHeight: 22
  },
  bold: {
    fontWeight: 'bold'
  },
  closeButton: {
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10
  },
  jobDetailMain: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10
  }
});